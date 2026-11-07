import { useCallback, useState } from 'react';
import { uploadSharedFile, type UploadCandidate, type UploadTarget } from '@/lib/fileStorage';
import type { SharedFile } from '@/types/sharedFile';

const UPLOAD_CONCURRENCY = 3;

export type UploadStatus = 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: string;
  name: string;
  relativePath: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
}

interface UploadJob extends UploadCandidate {
  id: string;
}

export function useUploads(onUploaded: (file: SharedFile) => void) {
  const [items, setItems] = useState<UploadItem[]>([]);

  const patchItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const runJob = useCallback(
    async (job: UploadJob, target: UploadTarget) => {
      try {
        const uploaded = await uploadSharedFile(job, target, (fraction) => patchItem(job.id, { progress: fraction }));
        patchItem(job.id, { progress: 1, status: 'done' });
        onUploaded(uploaded);
      } catch (error) {
        patchItem(job.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'This file could not be uploaded.',
        });
      }
    },
    [onUploaded, patchItem],
  );

  const startUploads = useCallback(
    (candidates: UploadCandidate[], target: UploadTarget) => {
      const jobs: UploadJob[] = candidates.map((candidate) => ({ ...candidate, id: crypto.randomUUID() }));
      setItems((previous) => [
        ...previous,
        ...jobs.map((job) => ({
          id: job.id,
          name: job.file.name,
          relativePath: job.relativePath,
          size: job.file.size,
          progress: 0,
          status: 'uploading' as const,
        })),
      ]);

      const queue = [...jobs];
      const worker = async () => {
        let job = queue.shift();
        while (job) {
          await runJob(job, target);
          job = queue.shift();
        }
      };
      void Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, jobs.length) }, worker));
    },
    [runJob],
  );

  const clearFinished = useCallback(() => {
    setItems((previous) => previous.filter((item) => item.status === 'uploading'));
  }, []);

  return { items, startUploads, clearFinished };
}
