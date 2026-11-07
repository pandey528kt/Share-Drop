export interface ActivityLog {
  id: string;
  action: ActivityAction;
  actor_email: string;
  subject_name: string | null;
  folder_name: string | null;
  created_at: string;
}

export type ActivityAction =
  | 'file_uploaded'
  | 'file_opened'
  | 'file_deleted'
  | 'folder_created'
  | 'folder_deleted'
  | 'folder_password_set'
  | 'folder_password_removed'
  | 'folder_unlock_failed';
