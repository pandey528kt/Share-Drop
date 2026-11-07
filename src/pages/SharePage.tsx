import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Download, Loader2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import FileIcon from '@/components/FileIcon';
import FilePreview from '@/components/FilePreview';
import { fetchSharedFileByToken } from '@/lib/fileStorage';
import { downloadSharedFile } from '@/lib/fileAccess';
import { formatBytes, formatDate, getPreviewKind, getTypeLabel } from '@/lib/format';
import type { SharedFile } from '@/types/sharedFile';

interface SharePageProps {
  token: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; file: SharedFile | null }
  | { status: 'error'; message: string };

export default function SharePage({ token }: SharePageProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSharedFileByToken(token)
      .then((file) => {
        if (!cancelled) setState({ status: 'ready', file });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'This link could not be opened.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleDownload = async (file: SharedFile) => {
    setDownloadError(null);
    setIsDownloading(true);
    try {
      await downloadSharedFile(file, null);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition-colors hover:text-teal-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Upload your own files
        </a>

        {state.status === 'loading' && (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-20 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
            Opening shared file...
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" className="mt-8 flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <p className="mt-4 text-base font-medium text-slate-900">{state.message}</p>
          </div>
        )}

        {state.status === 'ready' && !state.file && (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
            <AlertCircle className="h-8 w-8 text-slate-500" />
            <p className="mt-4 text-base font-medium text-slate-900">This link is invalid or the file was deleted.</p>
            <p className="mt-1 text-sm text-slate-600">Ask the person who shared it for a new link.</p>
          </div>
        )}

        {state.status === 'ready' && state.file && (
          <article className="mt-8 animate-scale-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                <FileIcon name={state.file.name} mimeType={state.file.mime_type} className="h-12 w-12" />
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold leading-[1.2] text-slate-900" title={state.file.name}>
                    {state.file.name}
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatBytes(state.file.size_bytes)} · {getTypeLabel(state.file.name, state.file.mime_type)} ·{' '}
                    {formatDate(state.file.created_at)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(state.file as SharedFile)}
                disabled={isDownloading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:opacity-60"
              >
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download
              </button>
            </div>

            {downloadError && (
              <p role="alert" className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 sm:px-6">
                {downloadError}
              </p>
            )}

            {getPreviewKind(state.file.mime_type) && (
              <div className="border-t border-slate-200 p-5 sm:p-6">
                <FilePreview file={state.file} folderPassword={null} />
              </div>
            )}
          </article>
        )}
      </main>
    </div>
  );
}
