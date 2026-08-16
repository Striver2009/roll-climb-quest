REVOKE EXECUTE ON FUNCTION public.build_route(uuid, uuid, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_daily_runs(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.roll_daily_run(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reroll_daily_run(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_current_task(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.roll_daily_run(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reroll_daily_run(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_current_task(uuid, text) TO authenticated;