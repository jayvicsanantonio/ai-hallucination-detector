import { Domain, VerificationStatus } from '../core/ContentTypes';
import { VerificationResult } from '../core/VerificationResult';
import { FeedbackData } from './FeedbackData';

export interface VerificationSession {
  id: string;
  userId: string;
  organizationId: string;
  contentId: string;
  domain: Domain;
  status: VerificationStatus;
  results?: VerificationResult;
  feedback?: FeedbackData;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}
