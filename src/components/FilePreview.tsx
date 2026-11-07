import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { createFileUrl } from '@/lib/fileAccess';
import { getPreviewKind } from '@/lib/format';
import type { SharedFile } from '@/types/sharedFile';

interface FilePreviewProps {
  file: SharedFile;
  folderPassword: string | null;
}

type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'error'; message: string };

export default function FilePreview({ file, folderPassword }: FilePreviewProps) {
  const [state, setState] = useState<PreviewState>({ status: 'loading' });
  const kind = getPreviewKind(file.mime_type);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    createFileUrl(file, folderPassword)
      .then((url) => {
        if (!cancelled) setState({ status: 'ready', url });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'This file could not be previewed.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [file, folderPassword]);

  if (!kind) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-6 py-16 text-center">
        <p className="text-base font-medium text-slate-900">Preview not available</p>
        <p className="mt-1 text-sm text-slate-600">Download this file to open it on your device.</p>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-6 py-24 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
        Loading preview...
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-6 py-16 text-sm font-medium text-red-700">
        <AlertCircle className="h-5 w-5" />
        {state.message}
      </div>
    );
  }

  const { url } = state;
  if (kind === 'image') {
    return (
      <div className="flex items-center justify-center rounded-xl bg-slate-100 p-3">
        <img src={url} alt={file.name} className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain" />
      </div>
    );
  }
  if (kind === 'video') {
    return <video src={url} controls className="max-h-[65vh] w-full rounded-xl bg-black" />;
  }
  if (kind === 'audio') {
    return (
      <div className="rounded-xl bg-slate-50 p-6">
        <audio src={url} controls className="w-full" />
      </div>
    );
  }
  return <iframe src={url} title={file.name} className="h-[65vh] w-full rounded-xl border border-slate-200" />;
}
