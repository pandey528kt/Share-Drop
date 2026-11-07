import { supabase } from '@/lib/supabase';
import { messageFromError } from '@/lib/errors';
import { uploadToBucket } from '@/lib/resumableUpload';
import type { SharedFile } from '@/types/sharedFile';

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

const LOAD_ERROR = 'We could not load your files. Please try again.';
const SHARED_FILE_COLUMNS = 'id, name, relative_path, size_bytes, mime_type, storage_path, share_token, folder_id, created_at';
const SHARE_TOKEN_PATTERN = /^[a-f0-9]{32}$/;

export interface UploadCandidate {
  file: File;
  relativePath: string;
}

export interface UploadTarget {
  folderId: string | null;
  password: string | null;
}

export async function fetchRootFiles(): Promise<SharedFile[]> {
  const { data, error } = await supabase
    .from('shared_files')
    .select(SHARED_FILE_COLUMNS)
    .is('folder_id', null)
    .order('created_at', { ascending: false });
  if (error || !Array.isArray(data)) throw new Error(LOAD_ERROR);
  return data as SharedFile[];
}

export async function fetchAllFiles(): Promise<SharedFile[]> {
  const { data, error } = await supabase
    .from('shared_files')
    .select(SHARED_FILE_COLUMNS)
    .order('created_at', { ascending: false });
  if (error || !Array.isArray(data)) throw new Error(LOAD_ERROR);
  return data as SharedFile[];
}

export async function fetchFolderFiles(folderId: string, password: string | null): Promise<SharedFile[]> {
  const { data, error } = await supabase.rpc('list_folder_files', {
    p_folder_id: folderId,
    p_password: password,
  });
  if (error || !Array.isArray(data)) throw new Error(messageFromError(error, LOAD_ERROR));
  return data as SharedFile[];
}

export async function fetchSharedFileByToken(token: string): Promise<SharedFile | null> {
  if (!SHARE_TOKEN_PATTERN.test(token)) return null;

  const { data, error } = await supabase
    .from('shared_files')
    .select(SHARED_FILE_COLUMNS)
    .eq('share_token', token)
    .maybeSingle();

  if (error) throw new Error('We could not load this file. Please try again.');
  return (data as SharedFile | null) ?? null;
}

function buildStoragePath(id: string, name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 120);
  return `${id}/${cleaned || 'file'}`;
}

export async function uploadSharedFile(
  candidate: UploadCandidate,
  target: UploadTarget,
  onProgress: (fraction: number) => void,
): Promise<SharedFile> {
  const { file, relativePath } = candidate;

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('This file is larger than the 2 GB limit.');
  }

  const id = crypto.randomUUID();
  const storagePath = buildStoragePath(id, file.name);
  const mimeType = file.type || 'application/octet-stream';

  await uploadToBucket(storagePath, file, mimeType, onProgress);

  const { data, error } = await supabase.rpc('register_shared_file', {
    p_id: id,
    p_name: file.name,
    p_relative_path: relativePath,
    p_size_bytes: file.size,
    p_mime_type: mimeType,
    p_storage_path: storagePath,
    p_folder_id: target.folderId,
    p_password: target.password,
  });

  if (error || !data) {
    throw new Error(messageFromError(error, 'The file uploaded, but its details could not be saved. Please try again.'));
  }
  return data as SharedFile;
}

export function getShareUrl(token: string): string {
  return `${window.location.origin}${window.location.pathname}?share=${encodeURIComponent(token)}`;
}
