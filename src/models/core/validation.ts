// Validation functions for core data models

import {
  ParsedContent,
  ExtractedEntity,
  ContentMetadata,
} from './ParsedContent';
import { VerificationResult, Issue } from './VerificationResult';
import {
  ContentType,
  EntityType,
  IssueType,
  IssueSeverity,
  RiskLevel,
} from './ContentTypes';
import { TextLocation } from './TextLocation';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ParsedContentValidator {
  static validate(content: ParsedContent): void {
    if (!content.id || typeof content.id !== 'string') {
      throw new ValidationError(
        'ParsedContent must have a valid id',
        'id'
      );
    }

    if (
      !content.originalContent ||
      typeof content.originalContent !== 'string'
    ) {
      throw new ValidationError(
        'ParsedContent must have originalContent',
        'originalContent'
      );
    }

    if (
      !content.extractedText ||
      typeof content.extractedText !== 'string'
    ) {
      throw new ValidationError(
        'ParsedContent must have extractedText',
        'extractedText'
      );
    }

    if (!this.isValidContentType(content.contentType)) {
      throw new ValidationError(
        'ParsedContent must have a valid contentType',
        'contentType'
      );
    }

    if (!content.createdAt || !(content.createdAt instanceof Date)) {
      throw new ValidationError(
        'ParsedContent must have a valid createdAt date',
        'createdAt'
      );
    }

    // Validate entities
    if (content.entities) {
      content.entities.forEach((entity, index) => {
        this.validateExtractedEntity(entity, `entities[${index}]`);
      });
    }

    // Validate metadata
    if (content.metadata) {
      this.validateContentMetadata(content.metadata);
    }
  }

  private static isValidContentType(type: any): type is ContentType {
    return ['text', 'pdf', 'docx', 'json'].includes(type);
  }

  private static validateExtractedEntity(
    entity: ExtractedEntity,
    fieldPath: string
  ): void {
    if (!entity.type || !this.isValidEntityType(entity.type)) {
      throw new ValidationError(
        `Invalid entity type at ${fieldPath}`,
        `${fieldPath}.type`
      );
    }

    if (!entity.value || typeof entity.value !== 'string') {
      throw new ValidationError(
        `Entity must have a value at ${fieldPath}`,
        `${fieldPath}.value`
      );
    }

    if (
      typeof entity.confidence !== 'number' ||
      entity.confidence < 0 ||
      entity.confidence > 1
    ) {
      throw new ValidationError(
        `Entity confidence must be between 0 and 1 at ${fieldPath}`,
        `${fieldPath}.confidence`
      );
    }

    if (!entity.location) {
      throw new ValidationError(
        `Entity must have a location at ${fieldPath}`,
        `${fieldPath}.location`
      );
    }

    this.validateTextLocation(
      entity.location,
      `${fieldPath}.location`
    );
  }

  private static isValidEntityType(type: any): type is EntityType {
    return [
      'person',
      'organization',
      'date',
      'amount',
      'regulation',
      'medical_term',
    ].includes(type);
  }

  private static validateTextLocation(
    location: TextLocation,
    fieldPath: string
  ): void {
    if (typeof location.start !== 'number' || location.start < 0) {
      throw new ValidationError(
        `TextLocation start must be a non-negative number at ${fieldPath}`,
        `${fieldPath}.start`
      );
    }

    if (
      typeof location.end !== 'number' ||
      location.end < location.start
    ) {
      throw new ValidationError(
        `TextLocation end must be >= start at ${fieldPath}`,
        `${fieldPath}.end`
      );
    }
  }

  private static validateContentMetadata(
    metadata: ContentMetadata
  ): void {
    if (
      metadata.fileSize !== undefined &&
      (typeof metadata.fileSize !== 'number' || metadata.fileSize < 0)
    ) {
      throw new ValidationError(
        'ContentMetadata fileSize must be a non-negative number',
        'metadata.fileSize'
      );
    }

    if (
      metadata.pageCount !== undefined &&
      (typeof metadata.pageCount !== 'number' ||
        metadata.pageCount < 0)
    ) {
      throw new ValidationError(
        'ContentMetadata pageCount must be a non-negative number',
        'metadata.pageCount'
      );
    }

    if (
      metadata.wordCount !== undefined &&
      (typeof metadata.wordCount !== 'number' ||
        metadata.wordCount < 0)
    ) {
      throw new ValidationError(
        'ContentMetadata wordCount must be a non-negative number',
        'metadata.wordCount'
      );
    }

    if (
      metadata.createdDate !== undefined &&
      !(metadata.createdDate instanceof Date)
    ) {
      throw new ValidationError(
        'ContentMetadata createdDate must be a Date',
        'metadata.createdDate'
      );
    }

    if (
      metadata.modifiedDate !== undefined &&
      !(metadata.modifiedDate instanceof Date)
    ) {
      throw new ValidationError(
        'ContentMetadata modifiedDate must be a Date',
        'metadata.modifiedDate'
      );
    }
  }
}

export class VerificationResultValidator {
  static validate(result: VerificationResult): void {
    if (
      !result.verificationId ||
      typeof result.verificationId !== 'string'
    ) {
      throw new ValidationError(
        'VerificationResult must have a valid verificationId',
        'verificationId'
      );
    }

    if (
      typeof result.overallConfidence !== 'number' ||
      result.overallConfidence < 0 ||
      result.overallConfidence > 100
    ) {
      throw new ValidationError(
        'VerificationResult overallConfidence must be between 0 and 100',
        'overallConfidence'
      );
    }

    if (!this.isValidRiskLevel(result.riskLevel)) {
      throw new ValidationError(
        'VerificationResult must have a valid riskLevel',
        'riskLevel'
      );
    }

    if (
      typeof result.processingTime !== 'number' ||
      result.processingTime < 0
    ) {
      throw new ValidationError(
        'VerificationResult processingTime must be a non-negative number',
        'processingTime'
      );
    }

    if (!result.timestamp || !(result.timestamp instanceof Date)) {
      throw new ValidationError(
        'VerificationResult must have a valid timestamp',
        'timestamp'
      );
    }

    // Validate issues
    if (result.issues) {
      result.issues.forEach((issue, index) => {
        this.validateIssue(issue, `issues[${index}]`);
      });
    }

    // Validate recommendations
    if (result.recommendations) {
      result.recommendations.forEach((rec, index) => {
        if (typeof rec !== 'string') {
          throw new ValidationError(
            `Recommendation at index ${index} must be a string`,
            `recommendations[${index}]`
          );
        }
      });
    }
  }

  private static isValidRiskLevel(level: any): level is RiskLevel {
    return ['low', 'medium', 'high', 'critical'].includes(level);
  }

  private static validateIssue(
    issue: Issue,
    fieldPath: string
  ): void {
    if (!issue.id || typeof issue.id !== 'string') {
      throw new ValidationError(
        `Issue must have a valid id at ${fieldPath}`,
        `${fieldPath}.id`
      );
    }

    if (!this.isValidIssueType(issue.type)) {
      throw new ValidationError(
        `Issue must have a valid type at ${fieldPath}`,
        `${fieldPath}.type`
      );
    }

    if (!this.isValidIssueSeverity(issue.severity)) {
      throw new ValidationError(
        `Issue must have a valid severity at ${fieldPath}`,
        `${fieldPath}.severity`
      );
    }

    if (!issue.description || typeof issue.description !== 'string') {
      throw new ValidationError(
        `Issue must have a description at ${fieldPath}`,
        `${fieldPath}.description`
      );
    }

    if (
      typeof issue.confidence !== 'number' ||
      issue.confidence < 0 ||
      issue.confidence > 1
    ) {
      throw new ValidationError(
        `Issue confidence must be between 0 and 1 at ${fieldPath}`,
        `${fieldPath}.confidence`
      );
    }

    if (
      !issue.moduleSource ||
      typeof issue.moduleSource !== 'string'
    ) {
      throw new ValidationError(
        `Issue must have a moduleSource at ${fieldPath}`,
        `${fieldPath}.moduleSource`
      );
    }

    if (!issue.location) {
      throw new ValidationError(
        `Issue must have a location at ${fieldPath}`,
        `${fieldPath}.location`
      );
    }

    ParsedContentValidator['validateTextLocation'](
      issue.location,
      `${fieldPath}.location`
    );

    // Validate evidence array
    if (issue.evidence) {
      issue.evidence.forEach((evidence, index) => {
        if (typeof evidence !== 'string') {
          throw new ValidationError(
            `Evidence at index ${index} must be a string at ${fieldPath}`,
            `${fieldPath}.evidence[${index}]`
          );
        }
      });
    }
  }

  private static isValidIssueType(type: any): type is IssueType {
    return [
      'factual_error',
      'logical_inconsistency',
      'compliance_violation',
    ].includes(type);
  }

  private static isValidIssueSeverity(
    severity: any
  ): severity is IssueSeverity {
    return ['low', 'medium', 'high', 'critical'].includes(severity);
  }
}

// Utility functions for creating validated instances
export class ModelFactory {
  static createParsedContent(
    data: Partial<ParsedContent>
  ): ParsedContent {
    const content: ParsedContent = {
      id: data.id || this.generateId(),
      originalContent: data.originalContent || '',
      extractedText: data.extractedText || data.originalContent || '',
      contentType: data.contentType || 'text',
      structure: data.structure || {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: data.entities || [],
      metadata: data.metadata || {},
      createdAt: data.createdAt || new Date(),
    };

    ParsedContentValidator.validate(content);
    return content;
  }

  static createVerificationResult(
    data: Partial<VerificationResult>
  ): VerificationResult {
    const result: VerificationResult = {
      verificationId: data.verificationId || this.generateId(),
      overallConfidence: data.overallConfidence ?? 0,
      riskLevel: data.riskLevel || 'low',
      issues: data.issues || [],
      auditTrail: data.auditTrail || [],
      processingTime: data.processingTime ?? 0,
      recommendations: data.recommendations || [],
      timestamp: data.timestamp || new Date(),
    };

    VerificationResultValidator.validate(result);
    return result;
  }

  static createIssue(data: Partial<Issue>): Issue {
    const issue: Issue = {
      id: data.id || this.generateId(),
      type: data.type || 'factual_error',
      severity: data.severity || 'low',
      location: data.location || { start: 0, end: 0 },
      description: data.description || '',
      evidence: data.evidence || [],
      suggestedFix: data.suggestedFix,
      confidence: data.confidence ?? 0,
      moduleSource: data.moduleSource || 'unknown',
    };

    VerificationResultValidator['validateIssue'](issue, 'issue');
    return issue;
  }

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Serialization utilities
export class ModelSerializer {
  static serializeParsedContent(content: ParsedContent): string {
    ParsedContentValidator.validate(content);
    return JSON.stringify(content, this.dateReplacer);
  }

  static deserializeParsedContent(json: string): ParsedContent {
    const data = JSON.parse(json, this.dateReviver);
    ParsedContentValidator.validate(data);
    return data;
  }

  static serializeVerificationResult(
    result: VerificationResult
  ): string {
    VerificationResultValidator.validate(result);
    return JSON.stringify(result, this.dateReplacer);
  }

  static deserializeVerificationResult(
    json: string
  ): VerificationResult {
    const data = JSON.parse(json, this.dateReviver);
    VerificationResultValidator.validate(data);
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
    // Also handle ISO date strings directly for common date fields
    if (
      typeof value === 'string' &&
      (key === 'createdAt' ||
        key === 'timestamp' ||
        key === 'createdDate' ||
        key === 'modifiedDate') &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    ) {
      return new Date(value);
    }
    return value;
  }
}
