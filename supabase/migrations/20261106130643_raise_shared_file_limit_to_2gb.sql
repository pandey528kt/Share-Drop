/*
# Raise shared file size limit to 2 GB

Plain-English summary: files can now be up to 2 GB instead of 50 MB. The database and the file storage bucket both enforce the new limit.

1. Modified Tables
- `shared_files`: the size check on `size_bytes` now allows up to 2 GB (2147483648 bytes).

2. Modified Storage Bucket
- `shared-files`: per-file size limit raised to 2 GB.

3. Security
- No change to access policies or grants.

4. Important Notes
- Idempotent: safe to re-run.
- Existing rows are unaffected, because every existing file is well under the new limit.
*/

ALTER TABLE shared_files DROP CONSTRAINT IF EXISTS shared_files_size_bytes_check;
ALTER TABLE shared_files ADD CONSTRAINT shared_files_size_bytes_check
  CHECK (size_bytes >= 0 AND size_bytes <= 2147483648);

UPDATE storage.buckets SET file_size_limit = 2147483648 WHERE id = 'shared-files';
