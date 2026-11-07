export interface SharedFile {
  id: string;
  name: string;
  relative_path: string;
  size_bytes: number;
  mime_type: string;
  storage_path: string;
  share_token: string;
  folder_id: string | null;
  created_at: string;
}
