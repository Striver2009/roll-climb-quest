CREATE OR REPLACE FUNCTION public.restart_daily_run(p_task_set_id uuid, p_local_date date)
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

  IF v_run.current_index = 0 AND v_run.completed_at IS NULL THEN
    RETURN v_run;
  END IF;

  v_seq := v_run.sequence;

  DELETE FROM public.daily_runs WHERE id = v_run.id;

  INSERT INTO public.daily_runs (user_id, task_set_id, local_date, sequence)
  VALUES (v_user, p_task_set_id, p_local_date, v_seq)
  RETURNING * INTO v_run;

  RETURN v_run;
END; $function$;

REVOKE ALL ON FUNCTION public.restart_daily_run(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restart_daily_run(uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.restart_daily_run(uuid, date) TO authenticated;