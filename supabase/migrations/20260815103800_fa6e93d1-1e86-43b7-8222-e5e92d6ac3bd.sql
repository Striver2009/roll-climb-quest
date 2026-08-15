CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.prune_daily_runs(p_user_id uuid, p_task_set_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.daily_runs
   WHERE user_id = p_user_id
     AND task_set_id = p_task_set_id
     AND local_date < (CURRENT_DATE - INTERVAL '30 days');
$$;

CREATE OR REPLACE FUNCTION public.build_route(p_task_set_id uuid, p_user_id uuid, p_avoid jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_arr JSONB[];
  v_seq JSONB := '[]'::jsonb;
  v_n INT; v_i INT; v_j INT; v_tmp JSONB; v_try INT := 0;
BEGIN
  SELECT array_agg(jsonb_build_object('id', id, 'title', title, 'description', description) ORDER BY position, created_at)
    INTO v_arr FROM public.tasks
   WHERE task_set_id = p_task_set_id AND user_id = p_user_id AND is_active;

  IF v_arr IS NULL OR array_length(v_arr, 1) = 0 THEN RAISE EXCEPTION 'no active tasks'; END IF;
  v_n := array_length(v_arr, 1);

  LOOP
    v_try := v_try + 1;
    v_seq := '[]'::jsonb;
    -- Fisher-Yates driven by cryptographically strong bytes (not the predictable PRNG).
    FOR v_i IN REVERSE v_n..2 LOOP
      v_j := 1 + (get_byte(gen_random_bytes(2), 0) * 256 + get_byte(gen_random_bytes(2), 1)) % v_i;
      v_tmp := v_arr[v_i]; v_arr[v_i] := v_arr[v_j]; v_arr[v_j] := v_tmp;
    END LOOP;
    FOR v_i IN 1..v_n LOOP v_seq := v_seq || v_arr[v_i]; END LOOP;

    EXIT WHEN v_try >= 12
      OR p_avoid IS NULL
      OR jsonb_array_length(p_avoid) = 0
      OR v_n < 2
      OR (v_seq::text <> p_avoid::text
          AND (v_seq->0->>'id') IS DISTINCT FROM (p_avoid->0->>'id'));
  END LOOP;

  RETURN v_seq;
END; $function$;

CREATE OR REPLACE FUNCTION public.roll_daily_run(p_task_set_id uuid, p_local_date date)
RETURNS daily_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  v_seq := public.build_route(p_task_set_id, v_user, v_prev);

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
SET search_path = public
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

  v_seq := public.build_route(p_task_set_id, v_user, v_run.sequence);

  DELETE FROM public.daily_runs WHERE id = v_run.id;

  INSERT INTO public.daily_runs (user_id, task_set_id, local_date, sequence)
  VALUES (v_user, p_task_set_id, p_local_date, v_seq)
  RETURNING * INTO v_run;

  RETURN v_run;
END; $function$;