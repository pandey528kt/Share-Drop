import { useCallback, useEffect, useState } from 'react';
import { fetchFolders } from '@/lib/folders';
import type { Folder } from '@/types/folder';

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setFolders(await fetchFolders());
      setLoadError(null);
      setStatus('ready');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'We could not load folders.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addFolder = useCallback((folder: Folder) => {
    setFolders((previous) => [folder, ...previous]);
  }, []);

  return { folders, status, loadError, reload: load, addFolder };
}
