import { FeedbackType } from '../core/ContentTypes';

export interface FeedbackData {
  verificationId: string;
  userFeedback: FeedbackType;
  corrections?: string;
  expertNotes?: string;
  userId: string;
  timestamp: Date;
  issueId?: string; // Specific issue being corrected
  confidence?: number; // User's confidence in their feedback
}
