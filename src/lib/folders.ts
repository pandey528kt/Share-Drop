import { supabase } from '@/lib/supabase';
import { messageFromError } from '@/lib/errors';
import type { Folder } from '@/types/folder';

const FOLDER_COLUMNS = 'id, name, is_protected, created_at';

export async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select(FOLDER_COLUMNS)
    .order('created_at', { ascending: false });
  if (error || !Array.isArray(data)) throw new Error('We could not load folders. Please try again.');
  return data as Folder[];
}

export async function fetchFolder(folderId: string): Promise<Folder | null> {
  const { data, error } = await supabase
    .from('folders')
    .select(FOLDER_COLUMNS)
    .eq('id', folderId)
    .maybeSingle();
  if (error) throw new Error('We could not load this folder. Please try again.');
  return (data as Folder | null) ?? null;
}

export async function createFolder(name: string, password: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('create_folder', {
    p_name: name,
    p_password: password,
  });
  if (error || typeof data !== 'string') {
    throw new Error(messageFromError(error, 'The folder could not be created. Please try again.'));
  }
  return data;
}

export async function verifyFolderPassword(folderId: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_folder_password', {
    p_folder_id: folderId,
    p_password: password,
  });
  if (error) throw new Error(messageFromError(error, 'The password could not be checked. Please try again.'));
  return data === true;
}

export async function setFolderPassword(folderId: string, password: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_folder_password', {
    p_folder_id: folderId,
    p_password: password ?? '',
  });
  if (error) throw new Error(messageFromError(error, 'The password could not be updated. Please try again.'));
}

export function getFolderUrl(folderId: string): string {
  return `${window.location.origin}${window.location.pathname}?folder=${encodeURIComponent(folderId)}`;
}
