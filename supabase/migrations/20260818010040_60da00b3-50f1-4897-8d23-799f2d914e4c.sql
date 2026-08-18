CREATE OR REPLACE FUNCTION public.build_route(p_task_set_id uuid, p_user_id uuid, p_avoid jsonb)
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
BEGIN
  SELECT array_agg(jsonb_build_object('id', id, 'title', title, 'description', description) ORDER BY position, created_at)
    INTO v_arr FROM public.tasks
   WHERE task_set_id = p_task_set_id AND user_id = p_user_id AND is_active;

  IF v_arr IS NULL OR array_length(v_arr, 1) = 0 THEN RAISE EXCEPTION 'no active tasks'; END IF;
  v_n := array_length(v_arr, 1);

  -- recent history (last 5 runs) to diverge from, plus the explicit avoid sequence
  SELECT COALESCE(array_agg(s), ARRAY[]::JSONB[]) INTO v_hist
    FROM (SELECT sequence AS s FROM public.daily_runs
           WHERE user_id = p_user_id AND task_set_id = p_task_set_id
           ORDER BY local_date DESC LIMIT 5) q;
  IF p_avoid IS NOT NULL AND jsonb_array_length(p_avoid) > 0 THEN
    v_hist := array_prepend(p_avoid, v_hist);
  END IF;

  -- allow at most ~1/3 of positions to match any recent run
  v_max_same := GREATEST(1, v_n / 3);

  LOOP
    v_try := v_try + 1;

    -- unbiased-enough Fisher-Yates using 6 fresh random bytes per swap
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

        -- never start or end on the same mission as a recent day
        IF (v_arr[1]->>'id') = (v_h->0->>'id')
           OR (v_arr[v_n]->>'id') = (v_h->(v_n - 1)->>'id') THEN
          v_ok := false; EXIT;
        END IF;

        -- limit how many missions land in the same slot
        v_same := 0;
        FOR v_i IN 1..v_n LOOP
          IF (v_arr[v_i]->>'id') = (v_h->(v_i - 1)->>'id') THEN v_same := v_same + 1; END IF;
        END LOOP;
        IF v_same > v_max_same THEN v_ok := false; EXIT; END IF;

        -- avoid reusing back-to-back mission pairs (kills "A always before B" feel)
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

REVOKE ALL ON FUNCTION public.build_route(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;