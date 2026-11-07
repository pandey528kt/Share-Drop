import { useState } from 'react';
import { ExternalLink, KeyRound, Lock, Unlock } from 'lucide-react';
import ConfirmButton from '@/components/ConfirmButton';
import SetFolderPasswordModal from '@/components/SetFolderPasswordModal';
import { useFolders } from '@/hooks/useFolders';
import { deleteFolderById } from '@/lib/fileAccess';
import { getFolderUrl, setFolderPassword } from '@/lib/folders';
import { formatDate } from '@/lib/format';
import type { Folder } from '@/types/folder';

const actionClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50';

export default function AdminFoldersPanel() {
  const { folders, status, loadError, reload } = useFolders();
  const [editing, setEditing] = useState<Folder | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const removePassword = async (folder: Folder) => {
    setActionError(null);
    try {
      await setFolderPassword(folder.id, null);
      reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The password could not be removed.');
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-slate-900">Folders</h2>
        <p className="text-sm text-slate-500">{folders.length} {folders.length === 1 ? 'folder' : 'folders'}</p>
      </div>

      {actionError && <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 sm:px-6">{actionError}</p>}

      {status === 'loading' && <p className="px-6 py-10 text-center text-sm text-slate-500">Loading folders...</p>}
      {status === 'error' && <p role="alert" className="px-6 py-10 text-center text-sm font-medium text-red-700">{loadError}</p>}
      {status === 'ready' && folders.length === 0 && (
        <p className="px-6 py-10 text-center text-sm text-slate-500">No folders yet.</p>
      )}

      <ul className="divide-y divide-slate-100">
        {folders.map((folder) => (
          <li key={folder.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-900">
                {folder.name}
                {folder.is_protected ? <Lock className="h-3.5 w-3.5 text-teal-700" /> : <Unlock className="h-3.5 w-3.5 text-slate-400" />}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {folder.is_protected ? 'Password protected' : 'Open to everyone'} · {formatDate(folder.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setEditing(folder)} className={actionClass}>
                <KeyRound className="h-3.5 w-3.5" />
                {folder.is_protected ? 'Change password' : 'Set password'}
              </button>
              {folder.is_protected && (
                <button type="button" onClick={() => removePassword(folder)} className={actionClass}>
                  Remove password
                </button>
              )}
              <a href={getFolderUrl(folder.id)} target="_blank" rel="noopener noreferrer" className={actionClass}>
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
              <ConfirmButton
                label="Delete"
                confirmLabel="Delete everything"
                onConfirm={async () => {
                  await deleteFolderById(folder.id, null);
                  reload();
                }}
                className="py-1.5 text-xs"
              />
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <SetFolderPasswordModal folder={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </section>
  );
}
