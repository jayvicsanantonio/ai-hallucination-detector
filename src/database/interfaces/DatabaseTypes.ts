// Database entity interfaces and types

export interface DatabaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserEntity extends DatabaseEntity {
  email: string;
  organizationId: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  lastLoginAt?: Date;
}

export interface OrganizationEntity extends DatabaseEntity {
  name: string;
  domain: string;
  settings: OrganizationSettings;
  subscriptionTier: 'basic' | 'professional' | 'enterprise';
  isActive: boolean;
}

export interface OrganizationSettings {
  retentionPeriodDays: number;
  allowedDomains: string[];
  complianceRequirements: string[];
  customRules?: string[];
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  emailAlerts: boolean;
  alertThresholds: {
    highRiskIssues: boolean;
    complianceViolations: boolean;
    systemErrors: boolean;
  };
}

export interface ContentEntity extends DatabaseEntity {
  originalContent: string;
  extractedText: string;
  contentType: string;
  contentHash: string;
  metadata: Record<string, any>;
  userId: string;
  organizationId: string;
}

export interface VerificationSessionEntity extends DatabaseEntity {
  userId: string;
  organizationId: string;
  contentId: string;
  domain: string;
  status: string;
  results?: Record<string, any>;
  processingTimeMs: number;
  errorMessage?: string;
  completedAt?: Date;
}

export interface AuditLogEntity extends DatabaseEntity {
  sessionId: string;
  userId?: string;
  organizationId: string;
  action: string;
  component: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface FeedbackEntity extends DatabaseEntity {
  verificationId: string;
  userId: string;
  organizationId: string;
  feedbackType: string;
  corrections?: string;
  expertNotes?: string;
  issueId?: string;
  confidence?: number;
}
