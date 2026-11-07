/*
# Create shared files table and storage bucket

Plain-English summary: adds a list of uploaded files (name, size, type, folder path, and a unique share token) and a private storage bucket that holds the file contents. The app has no sign-in, so everyone can upload, list, download, and delete files.

1. New Tables
- `shared_files`
  - `id` (uuid, primary key)
  - `name` (text, original file name)
  - `relative_path` (text, folder-relative path, e.g. "photos/cat.jpg")
  - `size_bytes` (bigint, file size, capped at 50 MB)
  - `mime_type` (text, detected content type)
  - `storage_path` (text, unique location inside the bucket)
  - `share_token` (text, unique random token used in share links)
  - `created_at` (timestamptz)

2. New Storage Bucket
- `shared-files`: private bucket, 50 MB per-object limit. Files are only reachable through short-lived signed URLs.

3. Security
- RLS enabled on `shared_files` with SELECT, INSERT, DELETE policies for `anon` and `authenticated` (no sign-in exists).
- Storage object policies limited to the `shared-files` bucket for SELECT, INSERT, DELETE.
- No UPDATE grants: files are immutable once uploaded.

4. Important Notes
- Idempotent: safe to re-run.
- Share tokens are generated in the database from random UUIDs.
*/

CREATE TABLE IF NOT EXISTS shared_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  relative_path text NOT NULL CHECK (char_length(relative_path) BETWEEN 1 AND 1024),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 52428800),
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  storage_path text NOT NULL UNIQUE,
  share_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shared_files_created_at_idx ON shared_files (created_at DESC);
CREATE INDEX IF NOT EXISTS shared_files_share_token_idx ON shared_files (share_token);

ALTER TABLE shared_files ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON shared_files TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_shared_files" ON shared_files;
CREATE POLICY "anon_select_shared_files" ON shared_files FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_shared_files" ON shared_files;
CREATE POLICY "anon_insert_shared_files" ON shared_files FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_shared_files" ON shared_files;
CREATE POLICY "anon_delete_shared_files" ON shared_files FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('shared-files', 'shared-files', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

DROP POLICY IF EXISTS "anon_select_shared_files_objects" ON storage.objects;
CREATE POLICY "anon_select_shared_files_objects" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'shared-files');

DROP POLICY IF EXISTS "anon_insert_shared_files_objects" ON storage.objects;
CREATE POLICY "anon_insert_shared_files_objects" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'shared-files');

DROP POLICY IF EXISTS "anon_delete_shared_files_objects" ON storage.objects;
CREATE POLICY "anon_delete_shared_files_objects" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'shared-files');
