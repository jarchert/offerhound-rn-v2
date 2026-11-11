/** Keep optional analysis failures scoped to its card, without obscuring profile navigation. */
export function profileAnalysisError(error: unknown): string {
  const status = (error as { context?: { status?: number } })?.context?.status;
  if (status === 404) return 'Profile analysis is not available in this environment yet. You can still view and edit your profile.';
  if (status === 401) return 'Your session could not be verified. Sign in again to run profile analysis.';
  if (status === 429) return 'Profile analysis is busy. Please try again later.';
  return 'Profile analysis could not be completed. Your profile is still available. Please try again.';
}
