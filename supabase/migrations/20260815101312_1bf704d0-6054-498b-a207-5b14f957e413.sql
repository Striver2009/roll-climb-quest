-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- TASK SETS
CREATE TABLE public.task_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎓',
  theme TEXT NOT NULL DEFAULT 'sakura',
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_sets TO authenticated;
GRANT ALL ON public.task_sets TO service_role;
ALTER TABLE public.task_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own task_sets" ON public.task_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX task_sets_user_idx ON public.task_sets(user_id);

-- TASKS
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_set_id UUID NOT NULL REFERENCES public.task_sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX tasks_set_idx ON public.tasks(task_set_id, position);
CREATE INDEX tasks_user_idx ON public.tasks(user_id);

-- DAILY RUNS
CREATE TABLE public.daily_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  task_set_id UUID NOT NULL REFERENCES public.task_sets(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  sequence JSONB NOT NULL,
  current_index INT NOT NULL DEFAULT 0,
  completed_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  rolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_runs_unique UNIQUE (user_id, task_set_id, local_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_runs TO authenticated;
GRANT ALL ON public.daily_runs TO service_role;
ALTER TABLE public.daily_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily_runs select" ON public.daily_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX daily_runs_user_set_date_idx ON public.daily_runs(user_id, task_set_id, local_date DESC);

-- immutability guard
CREATE OR REPLACE FUNCTION public.guard_daily_run_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.local_date <> OLD.local_date OR NEW.task_set_id <> OLD.task_set_id
     OR NEW.sequence::text <> OLD.sequence::text OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'daily run route is immutable';
  END IF;
  IF NEW.current_index < OLD.current_index THEN
    RAISE EXCEPTION 'progress cannot move backwards';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER daily_runs_immutable BEFORE UPDATE ON public.daily_runs
FOR EACH ROW EXECUTE FUNCTION public.guard_daily_run_immutable();

-- USER SETTINGS
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'spring',
  music_enabled BOOLEAN NOT NULL DEFAULT false,
  effects_enabled BOOLEAN NOT NULL DEFAULT true,
  music_volume NUMERIC NOT NULL DEFAULT 0.4,
  effects_volume NUMERIC NOT NULL DEFAULT 0.7,
  master_mute BOOLEAN NOT NULL DEFAULT false,
  animation_mode TEXT NOT NULL DEFAULT 'full',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- USER STATS
CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  total_completed_tasks INT NOT NULL DEFAULT 0,
  total_completed_days INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stats" ON public.user_stats FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- new user bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ROLL: idempotent, server-side Fisher-Yates
CREATE OR REPLACE FUNCTION public.roll_daily_run(p_task_set_id UUID, p_local_date DATE)
RETURNS public.daily_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_run public.daily_runs;
  v_arr JSONB[];
  v_seq JSONB := '[]'::jsonb;
  v_n INT; v_i INT; v_j INT; v_tmp JSONB;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.task_sets WHERE id = p_task_set_id AND user_id = v_user) THEN
    RAISE EXCEPTION 'task set not found';
  END IF;

  SELECT * INTO v_run FROM public.daily_runs
   WHERE user_id = v_user AND task_set_id = p_task_set_id AND local_date = p_local_date;
  IF FOUND THEN RETURN v_run; END IF;

  SELECT array_agg(jsonb_build_object('id', id, 'title', title, 'description', description) ORDER BY position, created_at)
    INTO v_arr FROM public.tasks
   WHERE task_set_id = p_task_set_id AND user_id = v_user AND is_active;

  IF v_arr IS NULL OR array_length(v_arr, 1) = 0 THEN RAISE EXCEPTION 'no active tasks'; END IF;

  v_n := array_length(v_arr, 1);
  FOR v_i IN REVERSE v_n..2 LOOP
    v_j := 1 + floor(random() * v_i)::int;
    v_tmp := v_arr[v_i]; v_arr[v_i] := v_arr[v_j]; v_arr[v_j] := v_tmp;
  END LOOP;
  FOR v_i IN 1..v_n LOOP v_seq := v_seq || v_arr[v_i]; END LOOP;

  INSERT INTO public.daily_runs (user_id, task_set_id, local_date, sequence)
  VALUES (v_user, p_task_set_id, p_local_date, v_seq)
  ON CONFLICT (user_id, task_set_id, local_date) DO NOTHING
  RETURNING * INTO v_run;

  IF v_run.id IS NULL THEN
    SELECT * INTO v_run FROM public.daily_runs
     WHERE user_id = v_user AND task_set_id = p_task_set_id AND local_date = p_local_date;
  END IF;
  RETURN v_run;
END; $$;
REVOKE ALL ON FUNCTION public.roll_daily_run(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.roll_daily_run(UUID, DATE) TO authenticated;

-- COMPLETE current task only
CREATE OR REPLACE FUNCTION public.complete_current_task(p_daily_run_id UUID, p_task_id TEXT)
RETURNS public.daily_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_run public.daily_runs;
  v_expected TEXT;
  v_total INT;
  v_done BOOLEAN := false;
  v_prev DATE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_run FROM public.daily_runs WHERE id = p_daily_run_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'run not found'; END IF;

  v_total := jsonb_array_length(v_run.sequence);
  IF v_run.current_index >= v_total THEN RAISE EXCEPTION 'adventure already complete'; END IF;

  v_expected := v_run.sequence->v_run.current_index->>'id';
  IF v_expected IS DISTINCT FROM p_task_id THEN RAISE EXCEPTION 'TASK LOCKED'; END IF;

  v_done := (v_run.current_index + 1) >= v_total;

  UPDATE public.daily_runs
     SET current_index = current_index + 1,
         completed_tasks = completed_tasks || jsonb_build_array(jsonb_build_object('id', p_task_id, 'at', now())),
         completed_at = CASE WHEN v_done THEN now() ELSE completed_at END
   WHERE id = v_run.id
  RETURNING * INTO v_run;

  UPDATE public.user_stats SET total_completed_tasks = total_completed_tasks + 1, updated_at = now()
   WHERE user_id = v_user;

  IF v_done THEN
    SELECT last_completed_date INTO v_prev FROM public.task_sets WHERE id = v_run.task_set_id;
    UPDATE public.task_sets
       SET current_streak = CASE WHEN v_prev = v_run.local_date THEN current_streak
                                 WHEN v_prev = v_run.local_date - 1 THEN current_streak + 1
                                 ELSE 1 END,
           last_completed_date = v_run.local_date,
           updated_at = now()
     WHERE id = v_run.task_set_id;
    UPDATE public.task_sets SET longest_streak = GREATEST(longest_streak, current_streak) WHERE id = v_run.task_set_id;
    UPDATE public.user_stats SET total_completed_days = total_completed_days + 1, updated_at = now() WHERE user_id = v_user;
  END IF;

  RETURN v_run;
END; $$;
REVOKE ALL ON FUNCTION public.complete_current_task(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_current_task(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER task_sets_touch BEFORE UPDATE ON public.task_sets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tasks_touch BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_runs;