import { STORAGE_BUCKET, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';

const RESUMABLE_ENDPOINT = `${supabaseUrl}/storage/v1/upload/resumable`;
const CHUNK_SIZE = 6 * 1024 * 1024;
const CHUNK_MAX_ATTEMPTS = 3;
const UPLOAD_FAILED = 'The file could not be uploaded. Please try again.';
const NETWORK_ERROR = 'network_error';

const authHeaders = {
  Authorization: `Bearer ${supabaseAnonKey}`,
  apikey: supabaseAnonKey,
};

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function sendRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: Blob | null,
  onUploadProgress?: (loaded: number) => void,
): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    if (onUploadProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onUploadProgress(event.loaded);
      };
    }
    xhr.onload = () => resolve(xhr);
    xhr.onerror = () => reject(new Error(NETWORK_ERROR));
    xhr.send(body);
  });
}

async function createResumableUpload(storagePath: string, contentType: string, size: number): Promise<string> {
  const metadata = [
    `bucketName ${toBase64(STORAGE_BUCKET)}`,
    `objectName ${toBase64(storagePath)}`,
    `contentType ${toBase64(contentType)}`,
    `cacheControl ${toBase64('max-age=3600')}`,
  ].join(',');

  const xhr = await sendRequest('POST', RESUMABLE_ENDPOINT, {
    ...authHeaders,
    'Tus-Resumable': '1.0.0',
    'Upload-Length': String(size),
    'Upload-Metadata': metadata,
    'x-upsert': 'false',
  }, null);

  const location = xhr.getResponseHeader('Location');
  if (xhr.status === 413) throw new Error('This file is larger than the server accepts.');
  if (xhr.status < 200 || xhr.status >= 300 || !location) throw new Error(UPLOAD_FAILED);
  return new URL(location, RESUMABLE_ENDPOINT).toString();
}

async function sendChunk(
  uploadUrl: string,
  chunk: Blob,
  offset: number,
  onChunkProgress: (loaded: number) => void,
): Promise<number> {
  const xhr = await sendRequest(
    'PATCH',
    uploadUrl,
    {
      ...authHeaders,
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': String(offset),
      'Content-Type': 'application/offset+octet-stream',
      'x-upsert': 'false',
    },
    chunk,
    onChunkProgress,
  );

  const newOffset = Number(xhr.getResponseHeader('Upload-Offset'));
  if (xhr.status < 200 || xhr.status >= 300 || newOffset !== offset + chunk.size) {
    throw new Error(UPLOAD_FAILED);
  }
  return newOffset;
}

export async function uploadToBucket(
  storagePath: string,
  file: File,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const uploadUrl = await createResumableUpload(storagePath, contentType, file.size);

  let offset = 0;
  do {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const chunkStart = offset;
    let attempt = 0;
    while (true) {
      try {
        offset = await sendChunk(uploadUrl, chunk, chunkStart, (loaded) =>
          onProgress(file.size === 0 ? 1 : (chunkStart + loaded) / file.size),
        );
        break;
      } catch (error) {
        attempt += 1;
        if (attempt >= CHUNK_MAX_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    onProgress(file.size === 0 ? 1 : offset / file.size);
  } while (offset < file.size);
}
