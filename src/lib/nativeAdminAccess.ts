export type NativeAdminCheck = {
  userId: string;
  allowed: boolean;
} | null;

export function nativeAdminAccess(
  restoringSession: boolean,
  currentUserId: string | null,
  check: NativeAdminCheck,
): 'loading' | 'denied' | 'allowed' {
  if (restoringSession) return 'loading';
  if (!currentUserId) return 'denied';
  if (!check || check.userId !== currentUserId) return 'loading';
  return check.allowed === true ? 'allowed' : 'denied';
}
