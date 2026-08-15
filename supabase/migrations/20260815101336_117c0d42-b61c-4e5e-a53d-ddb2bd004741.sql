REVOKE ALL ON FUNCTION public.roll_daily_run(UUID, DATE) FROM anon;
REVOKE ALL ON FUNCTION public.complete_current_task(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;