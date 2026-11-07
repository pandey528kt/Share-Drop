/*
# Folders with optional passwords and owner-only admin rights

Plain-English summary: people can now create folders, optionally protected by a password. Files inside a protected folder can only be listed, uploaded to, previewed, downloaded, or deleted by someone who enters the folder password. The owner account (tobopandey2309@gmail.com) can manage everything without the folder password.

1. New Tables
- `folders`: id, name, password_hash (bcrypt, never readable by the public), is_protected (computed), created_at.

2. Modified Tables
- `shared_files`: new optional `folder_id` linking a file to a folder. Deleting a folder deletes its file records.
- `shared_files` no longer allows direct inserts or deletes from the browser. All writes go through checked functions.

3. New Functions
- `is_owner()`: true only for the signed-in owner email.
- `create_folder`, `verify_folder_password`, `list_folder_files`, `register_shared_file`, `get_file_storage_path`, `delete_shared_file`, `delete_folder`, `set_folder_password` (owner only).
- `storage_object_is_protected`: lets storage hide files inside protected folders.

4. Security
- RLS on `folders`: public can read names and protection status only, never the password hash.
- RLS on `shared_files`: visible when at root, in an unprotected folder, or to the owner.
- Storage: anonymous users can upload to the bucket and read only unprotected objects. Deletes are removed from direct browser access.

5. Important Notes
- Folder passwords are 4 to 72 characters.
- Idempotent: safe to re-run.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') = 'tobopandey2309@gmail.com'
     AND coalesce(auth.jwt() ->> 'role', '') = 'authenticated';
$$;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner() TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  password_hash text,
  is_protected boolean GENERATED ALWAYS AS (password_hash IS NOT NULL) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.folders FROM anon, authenticated;
GRANT SELECT (id, name, is_protected, created_at) ON public.folders TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_folders" ON public.folders;
CREATE POLICY "public_select_folders" ON public.folders FOR SELECT
  TO anon, authenticated USING (true);

ALTER TABLE public.shared_files ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.folders(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS shared_files_folder_id_idx ON public.shared_files (folder_id);

REVOKE INSERT, UPDATE, DELETE ON public.shared_files FROM anon, authenticated;
GRANT SELECT ON public.shared_files TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_shared_files" ON public.shared_files;
DROP POLICY IF EXISTS "anon_insert_shared_files" ON public.shared_files;
DROP POLICY IF EXISTS "anon_delete_shared_files" ON public.shared_files;
DROP POLICY IF EXISTS "select_visible_shared_files" ON public.shared_files;
CREATE POLICY "select_visible_shared_files" ON public.shared_files FOR SELECT
  TO anon, authenticated
  USING (
    folder_id IS NULL
    OR public.is_owner()
    OR EXISTS (
      SELECT 1 FROM public.folders f
      WHERE f.id = shared_files.folder_id AND NOT f.is_protected
    )
  );

CREATE OR REPLACE FUNCTION public.assert_folder_access(p_folder_id uuid, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hash text;
BEGIN
  IF public.is_owner() THEN
    RETURN;
  END IF;

  SELECT f.password_hash INTO v_hash FROM public.folders f WHERE f.id = p_folder_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF v_hash IS NULL THEN
    RETURN;
  END IF;
  IF p_password IS NULL OR p_password = '' THEN
    RAISE EXCEPTION 'password_required';
  END IF;
  IF extensions.crypt(p_password, v_hash) IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'invalid_password';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_folder_access(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_folder(p_name text, p_password text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
BEGIN
  IF char_length(v_name) < 1 OR char_length(v_name) > 80 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF coalesce(p_password, '') <> '' AND (octet_length(p_password) < 4 OR octet_length(p_password) > 72) THEN
    RAISE EXCEPTION 'invalid_password_length';
  END IF;

  INSERT INTO public.folders (name, password_hash)
  VALUES (
    v_name,
    CASE WHEN coalesce(p_password, '') = '' THEN NULL
         ELSE extensions.crypt(p_password, extensions.gen_salt('bf')) END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

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
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_folder_files(p_folder_id uuid, p_password text DEFAULT NULL)
RETURNS SETOF public.shared_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_folder_access(p_folder_id, p_password);
  RETURN QUERY
    SELECT sf.* FROM public.shared_files sf
    WHERE sf.folder_id = p_folder_id
    ORDER BY sf.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_shared_file(
  p_id uuid,
  p_name text,
  p_relative_path text,
  p_size_bytes bigint,
  p_mime_type text,
  p_storage_path text,
  p_folder_id uuid DEFAULT NULL,
  p_password text DEFAULT NULL
)
RETURNS public.shared_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.shared_files;
BEGIN
  IF p_folder_id IS NOT NULL THEN
    PERFORM public.assert_folder_access(p_folder_id, p_password);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id = 'shared-files' AND o.name = p_storage_path
  ) THEN
    RAISE EXCEPTION 'upload_not_found';
  END IF;

  INSERT INTO public.shared_files (id, name, relative_path, size_bytes, mime_type, storage_path, folder_id)
  VALUES (p_id, p_name, p_relative_path, p_size_bytes, p_mime_type, p_storage_path, p_folder_id)
  RETURNING * INTO v_row;

  RETURN v_row;
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
BEGIN
  SELECT sf.folder_id INTO v_folder FROM public.shared_files sf WHERE sf.id = p_file_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF v_folder IS NOT NULL THEN
    PERFORM public.assert_folder_access(v_folder, p_password);
  END IF;

  RETURN QUERY SELECT sf.storage_path, sf.name FROM public.shared_files sf WHERE sf.id = p_file_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_shared_file(p_file_id uuid, p_password text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_folder uuid;
  v_path text;
BEGIN
  SELECT sf.folder_id, sf.storage_path INTO v_folder, v_path
  FROM public.shared_files sf WHERE sf.id = p_file_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF v_folder IS NOT NULL THEN
    PERFORM public.assert_folder_access(v_folder, p_password);
  END IF;

  DELETE FROM public.shared_files WHERE id = p_file_id;
  RETURN v_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_folder(p_folder_id uuid, p_password text DEFAULT NULL)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_paths text[];
BEGIN
  PERFORM public.assert_folder_access(p_folder_id, p_password);

  SELECT coalesce(array_agg(sf.storage_path), '{}') INTO v_paths
  FROM public.shared_files sf WHERE sf.folder_id = p_folder_id;

  DELETE FROM public.folders WHERE id = p_folder_id;
  RETURN v_paths;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_folder_password(p_folder_id uuid, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF coalesce(p_password, '') = '' THEN
    UPDATE public.folders SET password_hash = NULL WHERE id = p_folder_id;
  ELSE
    IF octet_length(p_password) < 4 OR octet_length(p_password) > 72 THEN
      RAISE EXCEPTION 'invalid_password_length';
    END IF;
    UPDATE public.folders
    SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
    WHERE id = p_folder_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.storage_object_is_protected(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_files sf
    JOIN public.folders f ON f.id = sf.folder_id
    WHERE sf.storage_path = p_name AND f.is_protected
  );
$$;

REVOKE ALL ON FUNCTION public.create_folder(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_folder_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_folder_files(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_shared_file(uuid, text, text, bigint, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_file_storage_path(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_shared_file(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_folder(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_folder_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.storage_object_is_protected(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_folder(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_folder_password(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_folder_files(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_shared_file(uuid, text, text, bigint, text, text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_file_storage_path(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_shared_file(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_folder(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_folder_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_object_is_protected(text) TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_shared_files_objects" ON storage.objects;
CREATE POLICY "anon_select_shared_files_objects" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'shared-files' AND NOT public.storage_object_is_protected(name));

DROP POLICY IF EXISTS "anon_delete_shared_files_objects" ON storage.objects;
