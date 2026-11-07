export const OWNER_EMAIL = 'tobopandey2309@gmail.com';

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === OWNER_EMAIL;
}
