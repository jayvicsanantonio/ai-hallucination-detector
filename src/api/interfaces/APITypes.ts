import {
  ContentType,
  Domain,
  UrgencyLevel,
} from '@/models/core/ContentTypes';
import { VerificationResult } from '@/models/core/VerificationResult';
import { FeedbackType } from '@/models/core/ContentTypes';

// API Request/Response interfaces
export interface VerifyContentRequest {
  content: string | Buffer;
  contentType: ContentType;
  domain: Domain;
  urgency: UrgencyLevel;
  metadata?: Record<string, any>;
  filename?: string;
}

export interface VerifyContentResponse {
  verificationId: string;
  status: 'processing' | 'completed';
  result?: VerificationResult;
  estimatedProcessingTime?: number;
}

export interface BatchVerifyRequest {
  documents: BatchDocument[];
  domain: Domain;
  urgency?: UrgencyLevel;
}

export interface BatchDocument {
  id: string;
  content: string | Buffer;
  contentType: ContentType;
  domain: Domain;
  filename?: string;
  metadata?: Record<string, any>;
}

export interface BatchVerifyResponse {
  batchId: string;
  status: 'processing' | 'completed' | 'partial';
  results: BatchResult[];
  totalDocuments: number;
  completedDocuments: number;
}

export interface BatchResult {
  documentId: string;
  verificationId: string;
  status: 'processing' | 'completed' | 'failed';
  result?: VerificationResult;
  error?: string;
}

export interface GetResultsResponse {
  verificationId: string;
  status: 'processing' | 'completed' | 'failed';
  result?: VerificationResult;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface FeedbackRequest {
  verificationId: string;
  feedback: FeedbackType;
  corrections?: string;
  expertNotes?: string;
  issueId?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  feedbackId: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: Date;
    requestId: string;
    retryable: boolean;
  };
}
