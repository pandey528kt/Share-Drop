import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, Link2, Loader2, Lock } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ConfirmButton from '@/components/ConfirmButton';
import FileWorkspace from '@/components/FileWorkspace';
import FolderPasswordGate from '@/components/FolderPasswordGate';
import { deleteFolderById } from '@/lib/fileAccess';
import { fetchFolder, getFolderUrl } from '@/lib/folders';
import { fetchFolderFiles } from '@/lib/fileStorage';
import type { Folder } from '@/types/folder';

interface FolderPageProps {
  folderId: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; folder: Folder };

export default function FolderPage({ folderId }: FolderPageProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFolder(folderId)
      .then((folder) => {
        if (cancelled) return;
        setState(folder ? { status: 'ready', folder } : { status: 'missing' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof Error ? error.message : 'This folder could not be opened.' });
      });
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition-colors hover:text-teal-900">
          <ArrowLeft className="h-4 w-4" />
          Back to all files
        </a>

        {state.status === 'loading' && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-20 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
            Opening folder...
          </div>
        )}

        {state.status === 'missing' && (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
            <AlertCircle className="h-8 w-8 text-slate-500" />
            <p className="mt-4 text-base font-medium text-slate-900">This folder does not exist or was deleted.</p>
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <p className="mt-4 text-base font-medium text-slate-900">{state.message}</p>
          </div>
        )}

        {state.status === 'ready' && state.folder.is_protected && !password && (
          <FolderPasswordGate folder={state.folder} onUnlock={setPassword} />
        )}

        {state.status === 'ready' && (!state.folder.is_protected || password) && (
          <FolderContents folder={state.folder} password={password} />
        )}
      </main>

      <footer className="pb-10 text-center text-sm text-slate-500">
        FileShare. Anyone with a link can download its file.
      </footer>
    </div>
  );
}

interface FolderContentsProps {
  folder: Folder;
  password: string | null;
}

function FolderContents({ folder, password }: FolderContentsProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const fetcher = useCallback(() => fetchFolderFiles(folder.id, password), [folder.id, password]);
  const target = { folderId: folder.id, password };

  const handleCopyLink = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(getFolderUrl(folder.id));
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setCopyError('Your browser blocked copying. Try again from a secure page.');
    }
  };

  const handleDeleteFolder = async () => {
    await deleteFolderById(folder.id, password);
    window.location.assign('/');
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-semibold leading-[1.2] tracking-tight text-slate-900">{folder.name}</h1>
            {folder.is_protected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                <Lock className="h-3 w-3" />
                Protected
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">Share this folder link. Protected folders still ask for the password.</p>
          {copyError && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{copyError}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {linkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
            {linkCopied ? 'Link copied' : 'Copy folder link'}
          </button>
          <ConfirmButton label="Delete folder" confirmLabel="Delete everything" onConfirm={handleDeleteFolder} />
        </div>
      </section>

      <FileWorkspace title="Files in this folder" fetcher={fetcher} target={target} folderPassword={password} />
    </div>
  );
}
