/*
# Owner activity log

Plain-English summary: every important action on the site is recorded in an activity log. Only the owner (tobopandey2309@gmail.com) can read it, from the admin panel.

1. New Table
- `activity_logs`: id, action, actor_email (signed-in email, or "Anonymous visitor"), subject_name (file or folder name), folder_id, folder_name, created_at.
- Logged actions: file_uploaded, file_opened, file_deleted, folder_created, folder_deleted, folder_password_set, folder_password_removed, folder_unlock_failed.

2. Modified Functions
- `get_file_storage_path`: records file_opened when a preview or download link is created.
- `verify_folder_password`: records folder_unlock_failed on a wrong password.

3. Triggers
- Inserts and deletes on `shared_files` and `folders`, and password changes on `folders`, write activity rows automatically.

4. Security
- RLS on `activity_logs`. Only the owner can select rows. Anonymous visitors and other signed-in users have no access.
- Nothing can write to the log directly from the browser; only the database functions and triggers write to it.

5. Important Notes
- Idempotent: safe to re-run.
*/

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN (
    'file_uploaded', 'file_opened', 'file_deleted',
    'folder_created', 'folder_deleted',
    'folder_password_set', 'folder_password_removed', 'folder_unlock_failed'
  )),
  actor_email text NOT NULL DEFAULT 'Anonymous visitor',
  subject_name text,
  folder_id uuid,
  folder_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.activity_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.activity_logs TO authenticated;

DROP POLICY IF EXISTS "owner_select_activity_logs" ON public.activity_logs;
CREATE POLICY "owner_select_activity_logs" ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_owner());

CREATE OR REPLACE FUNCTION public.log_shared_file_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (action, actor_email, subject_name, folder_id, folder_name)
    VALUES (
      'file_uploaded',
      coalesce(nullif(auth.jwt() ->> 'email', ''), 'Anonymous visitor'),
      NEW.name,
      NEW.folder_id,
      (SELECT f.name FROM public.folders f WHERE f.id = NEW.folder_id)
    );
    RETURN NEW;
  END IF;

  INSERT INTO public.activity_logs (action, actor_email, subject_name, folder_id, folder_name)
  VALUES (
    'file_deleted',
    coalesce(nullif(auth.jwt() ->> 'email', ''), 'Anonymous visitor'),
    OLD.name,
    OLD.folder_id,
    (SELECT f.name FROM public.folders f WHERE f.id = OLD.folder_id)
  );
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_folder_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor text := coalesce(nullif(auth.jwt() ->> 'email', ''), 'Anonymous visitor');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (action, actor_email, subject_name, folder_id, folder_name)
    VALUES ('folder_created', v_actor, NEW.name, NEW.id, NEW.name);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (action, actor_email, subject_name, folder_id, folder_name)
    VALUES ('folder_deleted', v_actor, OLD.name, OLD.id, OLD.name);
    RETURN OLD;
  END IF;

  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    INSERT INTO public.activity_logs (action, actor_email, subject_name, folder_id, folder_name)
    VALUES (
      CASE WHEN NEW.password_hash IS NULL THEN 'folder_password_removed' ELSE 'folder_password_set' END,
      v_actor,
      NEW.name,
      NEW.id,
      NEW.name
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_shared_file_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_folder_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS log_shared_file_insert ON public.shared_files;
CREATE TRIGGER log_shared_file_insert AFTER INSERT ON public.shared_files
  FOR EACH ROW EXECUTE FUNCTION public.log_shared_file_change();

DROP TRIGGER IF EXISTS log_shared_file_delete ON public.shared_files;
CREATE TRIGGER log_shared_file_delete AFTER DELETE ON public.shared_files
  FOR EACH ROW EXECUTE FUNCTION public.log_shared_file_change();

DROP TRIGGER IF EXISTS log_folder_insert ON public.folders;
CREATE TRIGGER log_folder_insert AFTER INSERT ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.log_folder_change();

DROP TRIGGER IF EXISTS log_folder_delete ON public.folders;
CREATE TRIGGER log_folder_delete AFTER DELETE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.log_folder_change();

DROP TRIGGER IF EXISTS log_folder_password_change ON public.folders;
CREATE TRIGGER log_folder_password_change AFTER UPDATE OF password_hash ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.log_folder_change();

CREATE OR REPLACE FUNCTION public.verify_folder_password(p_folder_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_folder_access(p_folder_id, p_password);
  RETURN true;
EXCEPTION WHEN raise_exception THEN
  INSERT INTO public.activity_logs (action, actor_email, subject_name, folder_id, folder_name)
  SELECT 'folder_unlock_failed', coalesce(nullif(auth.jwt() ->> 'email', ''), 'Anonymous visitor'), f.name, f.id, f.name
  FROM public.folders f WHERE f.id = p_folder_id;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_file_storage_path(p_file_id uuid, p_password text DEFAULT NULL)
RETURNS TABLE (out_storage_path text, out_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_folder uuid;
  v_name text;
BEGIN
  SELECT sf.folder_id, sf.name INTO v_folder, v_name FROM public.shared_files sf WHERE sf.id = p_file_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF v_folder IS NOT NULL THEN
    PERFORM public.assert_folder_access(v_folder, p_password);
  END IF;

  INSERT INTO public.activity_logs (action, actor_email, subject_name, folder_id, folder_name)
  VALUES (
    'file_opened',
    coalesce(nullif(auth.jwt() ->> 'email', ''), 'Anonymous visitor'),
    v_name,
    v_folder,
    (SELECT f.name FROM public.folders f WHERE f.id = v_folder)
  );

  RETURN QUERY SELECT sf.storage_path, sf.name FROM public.shared_files sf WHERE sf.id = p_file_id;
END;
$$;
