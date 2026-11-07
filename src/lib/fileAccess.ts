import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { messageFromError, GENERIC_ERROR } from '@/lib/errors';
import type { SharedFile } from '@/types/sharedFile';

async function callFileAccess(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? supabaseAnonKey;

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/file-access`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('network_error');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== 'object') {
    throw new Error(typeof body?.error === 'string' ? body.error : 'server_error');
  }
  return body as Record<string, unknown>;
}

export async function createFileUrl(file: SharedFile, password: string | null, download = false): Promise<string> {
  try {
    const body = await callFileAccess({ action: 'link', fileId: file.id, password, download });
    if (typeof body.url !== 'string') throw new Error('server_error');
    return body.url;
  } catch (error) {
    throw new Error(messageFromError(error as Error, GENERIC_ERROR));
  }
}

export async function downloadSharedFile(file: SharedFile, password: string | null): Promise<void> {
  const url = await createFileUrl(file, password, true);
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function deleteSharedFile(file: SharedFile, password: string | null): Promise<void> {
  try {
    await callFileAccess({ action: 'delete', fileId: file.id, password });
  } catch (error) {
    throw new Error(messageFromError(error as Error, 'This file could not be deleted. Please try again.'));
  }
}

export async function deleteFolderById(folderId: string, password: string | null): Promise<void> {
  try {
    await callFileAccess({ action: 'delete-folder', folderId, password });
  } catch (error) {
    throw new Error(messageFromError(error as Error, 'This folder could not be deleted. Please try again.'));
  }
}
