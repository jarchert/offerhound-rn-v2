// STUB: port from /offerhound-repo/src/hooks/useBetaFeedback.ts — separate session task.
// Types and function signatures mirror Lovable verbatim.
export type FeedbackCategory = 'bug' | 'ui_ux' | 'performance' | 'feature_request' | 'content' | 'other';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export interface FeedbackSubmission {
  category: FeedbackCategory;
  title: string;
  description: string;
  priority?: FeedbackPriority;
  screenshotUrl?: string;
}

export interface SubmittedFeedback {
  id: string;
  title: string;
}

export const useBetaFeedback = () => {
  const submitFeedback = async (
    _feedback: FeedbackSubmission
  ): Promise<SubmittedFeedback | null> => {
    return null;
  };
  return { submitFeedback, isSubmitting: false as boolean };
};
