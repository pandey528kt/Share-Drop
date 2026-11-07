import { AlertCircle, FolderOpen, RefreshCw } from 'lucide-react';
import FileRow from '@/components/FileRow';
import type { SharedFile } from '@/types/sharedFile';

interface FileListProps {
  files: SharedFile[];
  status: 'loading' | 'ready' | 'error';
  loadError: string | null;
  onReload: () => void;
  folderPassword: string | null;
  onPreview: (file: SharedFile) => void;
  onDelete: (file: SharedFile) => Promise<void>;
}

function LoadingRows() {
  return (
    <ul className="divide-y divide-slate-100" aria-label="Loading files">
      {[0, 1, 2].map((item) => (
        <li key={item} className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function FileList({
  files,
  status,
  loadError,
  onReload,
  folderPassword,
  onPreview,
  onDelete,
}: FileListProps) {
  if (status === 'loading' && files.length === 0) {
    return <LoadingRows />;
  }

  if (status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </span>
        <p className="mt-4 text-base font-medium text-slate-900">{loadError}</p>
        <button
          type="button"
          onClick={onReload}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <FolderOpen className="h-6 w-6" />
        </span>
        <p className="mt-4 text-base font-medium text-slate-900">No files yet</p>
        <p className="mt-1 text-sm text-slate-600">Upload something above and it will show up here.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {files.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          folderPassword={folderPassword}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
