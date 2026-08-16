CREATE OR REPLACE FUNCTION public.build_route(p_task_set_id uuid, p_user_id uuid, p_avoid jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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
    FOR v_i IN REVERSE v_n..2 LOOP
      v_j := 1 + (get_byte(extensions.gen_random_bytes(2), 0) * 256 + get_byte(extensions.gen_random_bytes(2), 1)) % v_i;
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