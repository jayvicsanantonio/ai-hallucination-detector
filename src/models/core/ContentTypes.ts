// Content type definitions and enums

export type ContentType = 'text' | 'txt' | 'pdf' | 'docx' | 'json';

export type Domain =
  | 'legal'
  | 'financial'
  | 'healthcare'
  | 'insurance';

export type UrgencyLevel = 'low' | 'medium' | 'high';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type IssueType =
  | 'factual_error'
  | 'logical_inconsistency'
  | 'compliance_violation';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type EntityType =
  | 'person'
  | 'organization'
  | 'date'
  | 'amount'
  | 'regulation'
  | 'medical_term'
  | 'email'
  | 'phone'
  | 'url'
  | 'ssn'
  | 'credit_card'
  | 'ip_address'
  | 'percentage'
  | 'legal_entity'
  | 'financial_instrument'
  | 'insurance_term'
  | 'place';

export type SourceType =
  | 'academic'
  | 'government'
  | 'industry'
  | 'news'
  | 'internal';

export type FeedbackType = 'correct' | 'incorrect' | 'partial';

export type VerificationStatus =
  | 'processing'
  | 'completed'
  | 'failed';
