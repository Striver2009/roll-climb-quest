CREATE TABLE public.world_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '📁',
  color text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.world_folders TO authenticated;
GRANT ALL ON public.world_folders TO service_role;

ALTER TABLE public.world_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own world_folders" ON public.world_folders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER world_folders_touch BEFORE UPDATE ON public.world_folders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX world_folders_user_idx ON public.world_folders (user_id, position);

ALTER TABLE public.task_sets
  ADD COLUMN folder_id uuid REFERENCES public.world_folders(id) ON DELETE SET NULL;

CREATE INDEX task_sets_folder_idx ON public.task_sets (folder_id);