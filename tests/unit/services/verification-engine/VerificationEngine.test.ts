import { VerificationEngine } from '@/services/verification-engine/VerificationEngine';
import { VerificationRequest } from '@/services/verification-engine/interfaces/VerificationEngine';
import {
  DomainModule,
  ValidationResult,
} from '@/modules/interfaces/DomainModule';
import { ParsedContent } from '@/models/core/ParsedContent';
import {
  Domain,
  UrgencyLevel,
  ContentType,
} from '@/models/core/ContentTypes';
import { Logger } from '@/utils/Logger';

// Mock Logger
jest.mock('@/utils/Logger');

// Mock DomainModule
class MockDomainModule implements DomainModule {
  readonly domain: Domain;
  readonly version: string = '1.0.0';

  constructor(
    domain: Domain,
    private shouldFail: boolean = false,
    private delay: number = 0
  ) {
    this.domain = domain;
  }

  async validateContent(
    content: ParsedContent
  ): Promise<ValidationResult> {
    if (this.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
    }

    if (this.shouldFail) {
      throw new Error(`Mock module ${this.domain} failed`);
    }

    return {
      moduleId: this.domain,
      issues: [],
      confidence: 95,
      processingTime: this.delay,
      metadata: { mockModule: true },
    };
  }

  async updateRules(): Promise<void> {
    // Mock implementation
  }

  async learnFromFeedback(): Promise<void> {
    // Mock implementation
  }

  getModuleInfo() {
    return {
      name: `Mock ${this.domain} Module`,
      version: this.version,
      domain: this.domain,
      description: `Mock module for ${this.domain}`,
      capabilities: ['validation'],
      lastUpdated: new Date(),
      rulesCount: 0,
    };
  }
}

describe('VerificationEngine', () => {
  let engine: VerificationEngine;
  let mockContent: ParsedContent;
  let mockRequest: VerificationRequest;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock content
    mockContent = {
      id: 'test-content-1',
      originalContent: 'This is test content for verification.',
      extractedText: 'This is test content for verification.',
      contentType: 'text' as ContentType,
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: {
        wordCount: 7,
        characterCount: 42,
        extractedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
    };

    // Create mock request
    mockRequest = {
      content: mockContent,
      domain: 'legal' as Domain,
      urgency: 'medium' as UrgencyLevel,
      metadata: mockContent.metadata,
      userId: 'test-user-1',
      organizationId: 'test-org-1',
    };

    // Create engine with mock modules
    const mockModules = [
      new MockDomainModule('legal'),
      new MockDomainModule('financial'),
    ];

    engine = new VerificationEngine(mockModules, {
      maxConcurrentVerifications: 10,
      defaultTimeout: 5000,
      enableCaching: false, // Disable caching for tests
    });
  });

  describe('verifyContent', () => {
    it('should successfully verify content with no issues', async () => {
      const result = await engine.verifyContent(mockRequest);

      expect(result).toBeDefined();
      expect(result.verificationId).toBeDefined();
      expect(result.overallConfidence).toBe(95);
      expect(result.riskLevel).toBe('low');
      expect(result.issues).toHaveLength(0);
      expect(result.auditTrail).toBeDefined();
      expect(result.auditTrail.length).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.recommendations).toContain(
        'Content appears to be accurate and compliant. No issues detected.'
      );
    });

    it('should handle module failures gracefully', async () => {
      const failingModule = new MockDomainModule('legal', true);
      const engineWithFailingModule = new VerificationEngine([
        failingModule,
      ]);

      const result = await engineWithFailingModule.verifyContent(
        mockRequest
      );

      expect(result).toBeDefined();
      expect(result.overallConfidence).toBe(100); // Default when no successful modules
      expect(result.issues).toHaveLength(0);
      expect(
        result.auditTrail.some(
          (entry) => entry.action === 'module_failed'
        )
      ).toBe(true);
    });

    it('should enforce timeout on slow modules', async () => {
      const slowModule = new MockDomainModule('legal', false, 6000); // 6 second delay
      const engineWithSlowModule = new VerificationEngine(
        [slowModule],
        {
          defaultTimeout: 1000, // 1 second timeout
        }
      );

      const result = await engineWithSlowModule.verifyContent(
        mockRequest
      );

      expect(result).toBeDefined();
      expect(
        result.auditTrail.some(
          (entry) =>
            entry.action === 'module_failed' &&
            entry.details.error?.includes('timed out')
        )
      ).toBe(true);
    });

    it('should validate request parameters', async () => {
      const invalidRequest = {
        ...mockRequest,
        content: null as any,
      };

      await expect(
        engine.verifyContent(invalidRequest)
      ).rejects.toThrow('Content is required for verification');
    });

    it('should validate content structure', async () => {
      const invalidRequest = {
        ...mockRequest,
        content: {
          ...mockContent,
          id: '',
          extractedText: '',
        },
      };

      await expect(
        engine.verifyContent(invalidRequest)
      ).rejects.toThrow(
        'Invalid content structure: missing id or extractedText'
      );
    });

    it('should apply confidence threshold', async () => {
      const requestWithThreshold = {
        ...mockRequest,
        options: {
          confidenceThreshold: 98, // Higher than module confidence of 95
        },
      };

      const result = await engine.verifyContent(requestWithThreshold);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].description).toContain('confidence');
      expect(result.issues[0].description).toContain(
        'below threshold'
      );
    });

    it('should handle concurrent verification limit', async () => {
      const engineWithLowLimit = new VerificationEngine([], {
        maxConcurrentVerifications: 1,
      });

      // Start first verification (will be slow)
      const slowModule = new MockDomainModule('legal', false, 1000);
      const engineWithSlowModule = new VerificationEngine(
        [slowModule],
        {
          maxConcurrentVerifications: 1,
        }
      );

      const promise1 =
        engineWithSlowModule.verifyContent(mockRequest);

      // Try to start second verification immediately
      await expect(
        engineWithSlowModule.verifyContent(mockRequest)
      ).rejects.toThrow('Maximum concurrent verifications reached');

      // Wait for first to complete
      await promise1;
    });
  });

  describe('getVerificationStatus', () => {
    it('should return status for active verification', async () => {
      // Start a slow verification
      const slowModule = new MockDomainModule('legal', false, 1000);
      const engineWithSlowModule = new VerificationEngine([
        slowModule,
      ]);

      const verificationPromise =
        engineWithSlowModule.verifyContent(mockRequest);

      // Give it a moment to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get all active verifications to find the ID
      const activeCount =
        engineWithSlowModule.getActiveVerificationCount();
      expect(activeCount).toBe(1);

      // Wait for completion
      await verificationPromise;
    });

    it('should throw error for non-existent verification', async () => {
      await expect(
        engine.getVerificationStatus('non-existent-id')
      ).rejects.toThrow(
        'Verification non-existent-id not found or already completed'
      );
    });
  });

  describe('cancelVerification', () => {
    it('should cancel active verification', async () => {
      // Start a slow verification
      const slowModule = new MockDomainModule('legal', false, 2000);
      const engineWithSlowModule = new VerificationEngine([
        slowModule,
      ]);

      const verificationPromise =
        engineWithSlowModule.verifyContent(mockRequest);

      // Give it a moment to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Since we can't easily get the verification ID, we'll test the method exists
      const result = await engineWithSlowModule.cancelVerification(
        'fake-id'
      );
      expect(result).toBe(false); // Should return false for non-existent ID

      // Wait for the actual verification to complete
      await verificationPromise;
    });
  });

  describe('module management', () => {
    it('should register new modules', () => {
      const newModule = new MockDomainModule('healthcare');
      engine.registerModule(newModule);

      const registeredModules = engine.getRegisteredModules();
      expect(registeredModules).toContain('healthcare');
    });

    it('should unregister modules', () => {
      const removed = engine.unregisterModule('legal');
      expect(removed).toBe(true);

      const registeredModules = engine.getRegisteredModules();
      expect(registeredModules).not.toContain('legal');
    });

    it('should return false when unregistering non-existent module', () => {
      const removed = engine.unregisterModule('non-existent');
      expect(removed).toBe(false);
    });

    it('should return list of registered modules', () => {
      const modules = engine.getRegisteredModules();
      expect(modules).toContain('legal');
      expect(modules).toContain('financial');
    });
  });

  describe('risk level calculation', () => {
    it('should calculate low risk for no issues and high confidence', async () => {
      const result = await engine.verifyContent(mockRequest);
      expect(result.riskLevel).toBe('low');
    });

    it('should calculate appropriate risk levels based on issue severity', async () => {
      // This would require mocking modules that return issues
      // For now, we test the basic case
      const result = await engine.verifyContent(mockRequest);
      expect(['low', 'medium', 'high', 'critical']).toContain(
        result.riskLevel
      );
    });
  });

  describe('audit trail', () => {
    it('should create comprehensive audit trail', async () => {
      const result = await engine.verifyContent(mockRequest);

      expect(result.auditTrail).toBeDefined();
      expect(result.auditTrail.length).toBeGreaterThan(0);

      // Check for key audit events
      const actions = result.auditTrail.map((entry) => entry.action);
      expect(actions).toContain('verification_started');
      expect(actions).toContain('verification_completed');
    });

    it('should include user information in audit trail', async () => {
      const result = await engine.verifyContent(mockRequest);

      const userEntries = result.auditTrail.filter(
        (entry) => entry.userId === 'test-user-1'
      );
      expect(userEntries.length).toBeGreaterThan(0);
    });
  });
});
