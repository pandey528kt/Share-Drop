import { useCallback, useEffect, useState } from 'react';
import { deleteSharedFile } from '@/lib/fileAccess';
import type { SharedFile } from '@/types/sharedFile';

export function useFileList(fetcher: () => Promise<SharedFile[]>) {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setStatus('loading');
    try {
      const rows = await fetcher();
      setFiles(rows);
      setLoadError(null);
      setStatus('ready');
    } catch (error) {
      setLoadError(error instanceof Error && error.message ? error.message : 'We could not load your files.');
      setStatus('error');
    }
  }, [fetcher]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const addFile = useCallback((file: SharedFile) => {
    setFiles((previous) => [file, ...previous]);
  }, []);

  const removeFile = useCallback(async (file: SharedFile, password: string | null) => {
    await deleteSharedFile(file, password);
    setFiles((previous) => previous.filter((item) => item.id !== file.id));
  }, []);

  return { files, status, loadError, reload: loadFiles, addFile, removeFile };
}
