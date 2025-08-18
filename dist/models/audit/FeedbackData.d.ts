import { FeedbackType } from '../core/ContentTypes';
export interface FeedbackData {
    verificationId: string;
    userFeedback: FeedbackType;
    corrections?: string;
    expertNotes?: string;
    userId: string;
    timestamp: Date;
    issueId?: string;
    confidence?: number;
}
//# sourceMappingURL=FeedbackData.d.ts.map