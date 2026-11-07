import type { UploadCandidate } from '@/lib/fileStorage';

function readDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const collected: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(collected);
          return;
        }
        collected.push(...batch);
        readBatch();
      }, reject);
    };
    readBatch();
  });
}

function readFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function walkEntry(entry: FileSystemEntry, prefix: string, out: UploadCandidate[]): Promise<void> {
  if (entry.isFile) {
    const file = await readFile(entry as FileSystemFileEntry);
    out.push({ file, relativePath: `${prefix}${entry.name}` });
    return;
  }
  if (entry.isDirectory) {
    const children = await readDirectoryEntries((entry as FileSystemDirectoryEntry).createReader());
    for (const child of children) {
      await walkEntry(child, `${prefix}${entry.name}/`, out);
    }
  }
}

export async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<UploadCandidate[]> {
  const entries = Array.from(dataTransfer.items)
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null);

  if (entries.length === 0) {
    return Array.from(dataTransfer.files).map((file) => ({ file, relativePath: file.name }));
  }

  const out: UploadCandidate[] = [];
  for (const entry of entries) {
    await walkEntry(entry, '', out);
  }
  return out;
}
