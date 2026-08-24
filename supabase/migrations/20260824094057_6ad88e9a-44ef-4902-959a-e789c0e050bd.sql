ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS day_of_week smallint;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_day_of_week_chk CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6));
CREATE INDEX IF NOT EXISTS tasks_set_day_idx ON public.tasks(task_set_id, day_of_week) WHERE is_active;

CREATE OR REPLACE FUNCTION public.build_route(p_task_set_id uuid, p_user_id uuid, p_avoid jsonb, p_local_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_arr JSONB[];
  v_best JSONB[];
  v_seq JSONB := '[]'::jsonb;
  v_hist JSONB[];
  v_h JSONB;
  v_n INT; v_i INT; v_j INT; v_tmp JSONB;
  v_try INT := 0;
  v_rand BIGINT;
  v_ok BOOLEAN;
  v_same INT;
  v_pairs INT;
  v_max_same INT;
  v_k INT;
  v_dow INT := EXTRACT(DOW FROM p_local_date)::int;
BEGIN
  SELECT array_agg(jsonb_build_object('id', id, 'title', title, 'description', description) ORDER BY position, created_at)
    INTO v_arr FROM public.tasks
   WHERE task_set_id = p_task_set_id AND user_id = p_user_id AND is_active
     AND (day_of_week IS NULL OR day_of_week = v_dow);

  IF v_arr IS NULL OR array_length(v_arr, 1) = 0 THEN RAISE EXCEPTION 'no active tasks'; END IF;
  v_n := array_length(v_arr, 1);

  SELECT COALESCE(array_agg(s), ARRAY[]::JSONB[]) INTO v_hist
    FROM (SELECT sequence AS s FROM public.daily_runs
           WHERE user_id = p_user_id AND task_set_id = p_task_set_id
           ORDER BY local_date DESC LIMIT 5) q;
  IF p_avoid IS NOT NULL AND jsonb_array_length(p_avoid) > 0 THEN
    v_hist := array_prepend(p_avoid, v_hist);
  END IF;

  v_max_same := GREATEST(1, v_n / 3);

  LOOP
    v_try := v_try + 1;

    FOR v_i IN REVERSE v_n..2 LOOP
      v_rand := 0;
      FOR v_k IN 0..5 LOOP
        v_rand := v_rand * 256 + get_byte(extensions.gen_random_bytes(1), 0);
      END LOOP;
      v_j := 1 + (v_rand % v_i);
      v_tmp := v_arr[v_i]; v_arr[v_i] := v_arr[v_j]; v_arr[v_j] := v_tmp;
    END LOOP;

    IF v_try = 1 THEN v_best := v_arr; END IF;

    v_ok := true;
    IF v_n >= 2 THEN
      FOREACH v_h IN ARRAY v_hist LOOP
        IF v_h IS NULL OR jsonb_array_length(v_h) <> v_n THEN CONTINUE; END IF;

        IF (v_arr[1]->>'id') = (v_h->0->>'id')
           OR (v_arr[v_n]->>'id') = (v_h->(v_n - 1)->>'id') THEN
          v_ok := false; EXIT;
        END IF;

        v_same := 0;
        FOR v_i IN 1..v_n LOOP
          IF (v_arr[v_i]->>'id') = (v_h->(v_i - 1)->>'id') THEN v_same := v_same + 1; END IF;
        END LOOP;
        IF v_same > v_max_same THEN v_ok := false; EXIT; END IF;

        IF v_n >= 4 THEN
          v_pairs := 0;
          FOR v_i IN 1..(v_n - 1) LOOP
            FOR v_k IN 0..(v_n - 2) LOOP
              IF (v_arr[v_i]->>'id') = (v_h->v_k->>'id')
                 AND (v_arr[v_i + 1]->>'id') = (v_h->(v_k + 1)->>'id') THEN
                v_pairs := v_pairs + 1;
              END IF;
            END LOOP;
          END LOOP;
          IF v_pairs > 0 THEN v_ok := false; EXIT; END IF;
        END IF;
      END LOOP;
    END IF;

    EXIT WHEN v_ok OR v_try >= 60;
  END LOOP;

  IF NOT v_ok THEN v_arr := v_best; END IF;

  v_seq := '[]'::jsonb;
  FOR v_i IN 1..v_n LOOP v_seq := v_seq || v_arr[v_i]; END LOOP;
  RETURN v_seq;
END; $function$;

REVOKE ALL ON FUNCTION public.build_route(uuid, uuid, jsonb, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.roll_daily_run(p_task_set_id uuid, p_local_date date)
 RETURNS daily_runs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_run public.daily_runs;
  v_seq JSONB;
  v_prev JSONB;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.task_sets WHERE id = p_task_set_id AND user_id = v_user) THEN
    RAISE EXCEPTION 'task set not found';
  END IF;

  SELECT * INTO v_run FROM public.daily_runs
   WHERE user_id = v_user AND task_set_id = p_task_set_id AND local_date = p_local_date;
  IF FOUND THEN RETURN v_run; END IF;

  PERFORM public.prune_daily_runs(v_user, p_task_set_id);

  SELECT sequence INTO v_prev FROM public.daily_runs
   WHERE user_id = v_user AND task_set_id = p_task_set_id AND local_date < p_local_date
   ORDER BY local_date DESC LIMIT 1;

  v_seq := public.build_route(p_task_set_id, v_user, v_prev, p_local_date);

  INSERT INTO public.daily_runs (user_id, task_set_id, local_date, sequence)
  VALUES (v_user, p_task_set_id, p_local_date, v_seq)
  ON CONFLICT (user_id, task_set_id, local_date) DO NOTHING
  RETURNING * INTO v_run;

  IF v_run.id IS NULL THEN
    SELECT * INTO v_run FROM public.daily_runs
     WHERE user_id = v_user AND task_set_id = p_task_set_id AND local_date = p_local_date;
  END IF;
  RETURN v_run;
END; $function$;

CREATE OR REPLACE FUNCTION public.reroll_daily_run(p_task_set_id uuid, p_local_date date)
 RETURNS daily_runs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_run public.daily_runs;
  v_seq JSONB;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_run FROM public.daily_runs
   WHERE user_id = v_user AND task_set_id = p_task_set_id AND local_date = p_local_date
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'run not found'; END IF;
  IF v_run.completed_at IS NULL THEN RAISE EXCEPTION 'RUN_NOT_COMPLETE'; END IF;

  v_seq := public.build_route(p_task_set_id, v_user, v_run.sequence, p_local_date);

  DELETE FROM public.daily_runs WHERE id = v_run.id;

  INSERT INTO public.daily_runs (user_id, task_set_id, local_date, sequence)
  VALUES (v_user, p_task_set_id, p_local_date, v_seq)
  RETURNING * INTO v_run;

  RETURN v_run;
END; $function$;

REVOKE ALL ON FUNCTION public.roll_daily_run(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reroll_daily_run(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.roll_daily_run(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reroll_daily_run(uuid, date) TO authenticated;