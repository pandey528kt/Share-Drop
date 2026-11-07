const MESSAGES: Record<string, string> = {
  invalid_password_length: 'Folder passwords must be between 4 and 72 characters.',
  password_required: 'This folder is password protected. Enter the password to continue.',
  invalid_password: 'The folder password is incorrect.',
  invalid_name: 'Please enter a folder name between 1 and 80 characters.',
  not_authorized: 'You do not have permission to do that.',
  not_found: 'This item no longer exists. It may have been deleted.',
  upload_not_found: 'The upload did not finish. Please try again.',
  cleanup_failed: 'Removed from the list, but its contents could not be fully cleaned up.',
  network_error: 'Network error. Check your connection and try again.',
};

export const GENERIC_ERROR = 'Something went wrong. Please try again.';

export function messageFromError(error: { message?: string } | null | undefined, fallback = GENERIC_ERROR): string {
  const text = error?.message ?? '';
  const code = Object.keys(MESSAGES).find((key) => text.includes(key));
  return code ? MESSAGES[code] : fallback;
}
