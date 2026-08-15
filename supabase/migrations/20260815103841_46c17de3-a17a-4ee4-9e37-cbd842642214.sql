REVOKE ALL ON FUNCTION public.prune_daily_runs(uuid, uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.build_route(uuid, uuid, jsonb) FROM anon, authenticated, public;

REVOKE ALL ON FUNCTION public.roll_daily_run(uuid, date) FROM anon, public;
REVOKE ALL ON FUNCTION public.reroll_daily_run(uuid, date) FROM anon, public;
REVOKE ALL ON FUNCTION public.complete_current_task(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.roll_daily_run(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reroll_daily_run(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_current_task(uuid, text) TO authenticated;