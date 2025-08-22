// Validation functions for audit models

import { VerificationSession } from './VerificationSession';
import { FeedbackData } from './FeedbackData';
import { AuditEntry, AuditAction, AuditSeverity } from './AuditEntry';
import {
  Domain,
  VerificationStatus,
  FeedbackType,
} from '../core/ContentTypes';

export class AuditValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'AuditValidationError';
  }
}

export class VerificationSessionValidator {
  static validate(session: VerificationSession): void {
    if (!session.id || typeof session.id !== 'string') {
      throw new AuditValidationError(
        'VerificationSession must have a valid id',
        'id'
      );
    }

    if (!session.userId || typeof session.userId !== 'string') {
      throw new AuditValidationError(
        'VerificationSession must have a valid userId',
        'userId'
      );
    }

    if (
      !session.organizationId ||
      typeof session.organizationId !== 'string'
    ) {
      throw new AuditValidationError(
        'VerificationSession must have a valid organizationId',
        'organizationId'
      );
    }

    if (!session.contentId || typeof session.contentId !== 'string') {
      throw new AuditValidationError(
        'VerificationSession must have a valid contentId',
        'contentId'
      );
    }

    if (!this.isValidDomain(session.domain)) {
      throw new AuditValidationError(
        'VerificationSession must have a valid domain',
        'domain'
      );
    }

    if (!this.isValidVerificationStatus(session.status)) {
      throw new AuditValidationError(
        'VerificationSession must have a valid status',
        'status'
      );
    }

    if (!session.createdAt || !(session.createdAt instanceof Date)) {
      throw new AuditValidationError(
        'VerificationSession must have a valid createdAt date',
        'createdAt'
      );
    }

    if (
      session.completedAt &&
      !(session.completedAt instanceof Date)
    ) {
      throw new AuditValidationError(
        'VerificationSession completedAt must be a valid date',
        'completedAt'
      );
    }

    if (
      session.completedAt &&
      session.completedAt < session.createdAt
    ) {
      throw new AuditValidationError(
        'VerificationSession completedAt cannot be before createdAt',
        'completedAt'
      );
    }

    // Validate that completed sessions have results or error message
    if (
      session.status === 'completed' &&
      !session.results &&
      !session.errorMessage
    ) {
      throw new AuditValidationError(
        'Completed VerificationSession must have results or errorMessage',
        'results'
      );
    }

    if (session.status === 'failed' && !session.errorMessage) {
      throw new AuditValidationError(
        'Failed VerificationSession must have errorMessage',
        'errorMessage'
      );
    }
  }

  private static isValidDomain(domain: any): domain is Domain {
    return ['legal', 'financial', 'healthcare', 'insurance'].includes(
      domain
    );
  }

  private static isValidVerificationStatus(
    status: any
  ): status is VerificationStatus {
    return ['processing', 'completed', 'failed'].includes(status);
  }
}

export class FeedbackDataValidator {
  static validate(feedback: FeedbackData): void {
    if (
      !feedback.verificationId ||
      typeof feedback.verificationId !== 'string'
    ) {
      throw new AuditValidationError(
        'FeedbackData must have a valid verificationId',
        'verificationId'
      );
    }

    if (!this.isValidFeedbackType(feedback.userFeedback)) {
      throw new AuditValidationError(
        'FeedbackData must have a valid userFeedback',
        'userFeedback'
      );
    }

    if (!feedback.userId || typeof feedback.userId !== 'string') {
      throw new AuditValidationError(
        'FeedbackData must have a valid userId',
        'userId'
      );
    }

    if (
      !feedback.timestamp ||
      !(feedback.timestamp instanceof Date)
    ) {
      throw new AuditValidationError(
        'FeedbackData must have a valid timestamp',
        'timestamp'
      );
    }

    if (
      feedback.confidence !== undefined &&
      (typeof feedback.confidence !== 'number' ||
        feedback.confidence < 0 ||
        feedback.confidence > 1)
    ) {
      throw new AuditValidationError(
        'FeedbackData confidence must be between 0 and 1',
        'confidence'
      );
    }

    // Validate that partial feedback has corrections
    if (
      feedback.userFeedback === 'partial' &&
      !feedback.corrections
    ) {
      throw new AuditValidationError(
        'Partial feedback must include corrections',
        'corrections'
      );
    }

    // Validate that incorrect feedback has corrections or expert notes
    if (
      feedback.userFeedback === 'incorrect' &&
      !feedback.corrections &&
      !feedback.expertNotes
    ) {
      throw new AuditValidationError(
        'Incorrect feedback must include corrections or expert notes',
        'corrections'
      );
    }
  }

  private static isValidFeedbackType(
    type: any
  ): type is FeedbackType {
    return ['correct', 'incorrect', 'partial'].includes(type);
  }
}

export class AuditEntryValidator {
  static validate(entry: AuditEntry): void {
    if (!entry.id || typeof entry.id !== 'string') {
      throw new AuditValidationError(
        'AuditEntry must have a valid id',
        'id'
      );
    }

    if (!entry.sessionId || typeof entry.sessionId !== 'string') {
      throw new AuditValidationError(
        'AuditEntry must have a valid sessionId',
        'sessionId'
      );
    }

    if (!entry.timestamp || !(entry.timestamp instanceof Date)) {
      throw new AuditValidationError(
        'AuditEntry must have a valid timestamp',
        'timestamp'
      );
    }

    if (!this.isValidAuditAction(entry.action)) {
      throw new AuditValidationError(
        'AuditEntry must have a valid action',
        'action'
      );
    }

    if (!entry.component || typeof entry.component !== 'string') {
      throw new AuditValidationError(
        'AuditEntry must have a valid component',
        'component'
      );
    }

    if (!this.isValidAuditSeverity(entry.severity)) {
      throw new AuditValidationError(
        'AuditEntry must have a valid severity',
        'severity'
      );
    }

    if (typeof entry.success !== 'boolean') {
      throw new AuditValidationError(
        'AuditEntry must have a valid success boolean',
        'success'
      );
    }

    if (
      entry.duration !== undefined &&
      (typeof entry.duration !== 'number' || entry.duration < 0)
    ) {
      throw new AuditValidationError(
        'AuditEntry duration must be a non-negative number',
        'duration'
      );
    }

    if (!entry.success && !entry.errorMessage) {
      throw new AuditValidationError(
        'Failed AuditEntry must have an errorMessage',
        'errorMessage'
      );
    }

    // Validate details is an object
    if (
      !entry.details ||
      typeof entry.details !== 'object' ||
      Array.isArray(entry.details)
    ) {
      throw new AuditValidationError(
        'AuditEntry details must be an object',
        'details'
      );
    }
  }

  private static isValidAuditAction(
    action: any
  ): action is AuditAction {
    const validActions: AuditAction[] = [
      'session_created',
      'content_uploaded',
      'content_parsed',
      'verification_started',
      'verification_completed',
      'verification_failed',
      'issue_detected',
      'feedback_submitted',
      'results_accessed',
      'export_requested',
      'user_authenticated',
      'user_authorized',
      'configuration_changed',
      'system_error',
      'security_event',
    ];
    return validActions.includes(action);
  }

  private static isValidAuditSeverity(
    severity: any
  ): severity is AuditSeverity {
    return ['info', 'warning', 'error', 'critical'].includes(
      severity
    );
  }
}

// Factory functions for creating validated audit objects
export class AuditModelFactory {
  static createVerificationSession(
    data: Partial<VerificationSession>
  ): VerificationSession {
    const session: VerificationSession = {
      id: data.id || this.generateId(),
      userId: data.userId || '',
      organizationId: data.organizationId || '',
      contentId: data.contentId || '',
      domain: data.domain || 'legal',
      status: data.status || 'processing',
      results: data.results,
      feedback: data.feedback,
      createdAt: data.createdAt || new Date(),
      completedAt: data.completedAt,
      errorMessage: data.errorMessage,
    };

    VerificationSessionValidator.validate(session);
    return session;
  }

  static createFeedbackData(
    data: Partial<FeedbackData>
  ): FeedbackData {
    const feedback: FeedbackData = {
      verificationId: data.verificationId || '',
      userFeedback: data.userFeedback || 'correct',
      corrections: data.corrections,
      expertNotes: data.expertNotes,
      userId: data.userId || '',
      timestamp: data.timestamp || new Date(),
      issueId: data.issueId,
      confidence: data.confidence,
    };

    FeedbackDataValidator.validate(feedback);
    return feedback;
  }

  static createAuditEntry(data: Partial<AuditEntry>): AuditEntry {
    const entry: AuditEntry = {
      id: data.id || this.generateId(),
      sessionId: data.sessionId || '',
      timestamp: data.timestamp || new Date(),
      action: data.action || 'session_created',
      component: data.component || 'unknown',
      details: data.details || {},
      userId: data.userId,
      organizationId: data.organizationId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      duration: data.duration,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
      severity: data.severity || 'info',
    };

    AuditEntryValidator.validate(entry);
    return entry;
  }

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Serialization utilities for audit models
export class AuditModelSerializer {
  static serializeVerificationSession(
    session: VerificationSession
  ): string {
    VerificationSessionValidator.validate(session);
    return JSON.stringify(session, this.dateReplacer);
  }

  static deserializeVerificationSession(
    json: string
  ): VerificationSession {
    const data = JSON.parse(json, this.dateReviver);
    VerificationSessionValidator.validate(data);
    return data;
  }

  static serializeFeedbackData(feedback: FeedbackData): string {
    FeedbackDataValidator.validate(feedback);
    return JSON.stringify(feedback, this.dateReplacer);
  }

  static deserializeFeedbackData(json: string): FeedbackData {
    const data = JSON.parse(json, this.dateReviver);
    FeedbackDataValidator.validate(data);
    return data;
  }

  static serializeAuditEntry(entry: AuditEntry): string {
    AuditEntryValidator.validate(entry);
    return JSON.stringify(entry, this.dateReplacer);
  }

  static deserializeAuditEntry(json: string): AuditEntry {
    const data = JSON.parse(json, this.dateReviver);
    AuditEntryValidator.validate(data);
    return data;
  }

  private static dateReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  private static dateReviver(key: string, value: any): any {
    if (
      value &&
      typeof value === 'object' &&
      value.__type === 'Date'
    ) {
      return new Date(value.value);
    }
    // Handle common date fields
    if (
      typeof value === 'string' &&
      (key === 'createdAt' ||
        key === 'completedAt' ||
        key === 'timestamp') &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    ) {
      return new Date(value);
    }
    return value;
  }
}
