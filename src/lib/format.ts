export type PreviewKind = 'image' | 'video' | 'audio' | 'pdf';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : value < 10 ? 1 : 0)} ${units[index]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toUpperCase() : '';
}

export function getTypeLabel(name: string, mimeType: string): string {
  return getExtension(name) || mimeType.split('/')[1]?.toUpperCase() || 'File';
}

export function getPreviewKind(mimeType: string): PreviewKind | null {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/svg+xml') return null;
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return null;
}

export function getFolderPath(relativePath: string): string | null {
  const slash = relativePath.lastIndexOf('/');
  return slash > 0 ? relativePath.slice(0, slash) : null;
}
