ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.build_route(p_task_set_id uuid, p_user_id uuid, p_avoid jsonb, p_local_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_arr JSONB[];
  v_out JSONB[] := ARRAY[]::JSONB[];
  v_tier JSONB[];
  v_seq JSONB := '[]'::jsonb;
  v_hist JSONB[];
  v_h JSONB;
  v_n INT; v_m INT; v_i INT; v_j INT; v_k INT; v_tmp JSONB;
  v_try INT := 0;
  v_rand BIGINT;
  v_ok BOOLEAN;
  v_same INT;
  v_max_same INT;
  v_p INT;
  v_dow SMALLINT := EXTRACT(DOW FROM p_local_date)::smallint;
BEGIN
  SELECT array_agg(jsonb_build_object('id', id, 'title', title, 'description', description, 'priority', priority) ORDER BY position, created_at)
    INTO v_arr FROM public.tasks
   WHERE task_set_id = p_task_set_id AND user_id = p_user_id AND is_active
     AND (COALESCE(array_length(days, 1), 0) = 0 OR v_dow = ANY(days));

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
    v_out := ARRAY[]::JSONB[];

    -- shuffle inside each importance tier: most (2) -> medium (1) -> least (0)
    FOR v_p IN REVERSE 2..0 LOOP
      v_tier := ARRAY[]::JSONB[];
      FOR v_i IN 1..v_n LOOP
        IF COALESCE((v_arr[v_i]->>'priority')::int, 1) = v_p THEN
          v_tier := array_append(v_tier, v_arr[v_i]);
        END IF;
      END LOOP;

      v_m := COALESCE(array_length(v_tier, 1), 0);
      IF v_m > 1 THEN
        FOR v_i IN REVERSE v_m..2 LOOP
          v_rand := 0;
          FOR v_k IN 0..5 LOOP
            v_rand := v_rand * 256 + get_byte(extensions.gen_random_bytes(1), 0);
          END LOOP;
          v_j := 1 + (v_rand % v_i);
          v_tmp := v_tier[v_i]; v_tier[v_i] := v_tier[v_j]; v_tier[v_j] := v_tmp;
        END LOOP;
      END IF;

      FOR v_i IN 1..v_m LOOP
        v_out := array_append(v_out, v_tier[v_i]);
      END LOOP;
    END LOOP;

    v_ok := true;
    IF v_n >= 2 THEN
      FOREACH v_h IN ARRAY v_hist LOOP
        IF v_h IS NULL OR jsonb_array_length(v_h) <> v_n THEN CONTINUE; END IF;
        v_same := 0;
        FOR v_i IN 1..v_n LOOP
          IF (v_out[v_i]->>'id') = (v_h->(v_i - 1)->>'id') THEN v_same := v_same + 1; END IF;
        END LOOP;
        IF v_same > v_max_same THEN v_ok := false; EXIT; END IF;
      END LOOP;
    END IF;

    EXIT WHEN v_ok OR v_try >= 40;
  END LOOP;

  v_seq := '[]'::jsonb;
  FOR v_i IN 1..v_n LOOP v_seq := v_seq || v_out[v_i]; END LOOP;
  RETURN v_seq;
END; $function$;

REVOKE ALL ON FUNCTION public.build_route(uuid, uuid, jsonb, date) FROM anon, authenticated;