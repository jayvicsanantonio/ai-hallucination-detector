import { ResultsProcessor } from '@/services/verification-engine/ResultsProcessor';
import { VerificationRequest } from '@/services/verification-engine/interfaces/VerificationEngine';
import { ValidationResult } from '@/modules/interfaces/DomainModule';
import { ParsedContent } from '@/models/core/ParsedContent';
import {
  Domain,
  UrgencyLevel,
  ContentType,
} from '@/models/core/ContentTypes';

// Mock Logger
jest.mock('@/utils/Logger');

describe('ResultsProcessor', () => {
  let processor: ResultsProcessor;
  let mockRequest: VerificationRequest;
  let mockModuleResults: ValidationResult[];

  beforeEach(() => {
    processor = new ResultsProcessor({
      enableCaching: false, // Disable caching for most tests
      cacheTtl: 3600,
      enablePersistence: false, // Disable for testing
      confidenceWeights: {
        legal: 1.0,
        financial: 1.2,
        healthcare: 1.1,
        insurance: 1.0,
      },
    });

    const mockContent: ParsedContent = {
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
      },
      createdAt: new Date(),
    };

    mockRequest = {
      content: mockContent,
      domain: 'legal' as Domain,
      urgency: 'medium' as UrgencyLevel,
      metadata: mockContent.metadata,
      userId: 'test-user-1',
      organizationId: 'test-org-1',
    };

    mockModuleResults = [
      {
        moduleId: 'legal',
        issues: [],
        confidence: 95,
        processingTime: 100,
        metadata: { testModule: true },
      },
      {
        moduleId: 'fact-checker',
        issues: [],
        confidence: 90,
        processingTime: 150,
        metadata: { testModule: true },
      },
    ];
  });

  describe('processResults', () => {
    it('should process results with no issues', async () => {
      const result = await processor.processResults(
        'test-verification-1',
        mockRequest,
        mockModuleResults,
        250
      );

      expect(result).toBeDefined();
      expect(result.verificationId).toBe('test-verification-1');
      expect(result.overallConfidence).toBe(93); // Average of 95 and 90, rounded
      expect(result.riskLevel).toBe('low');
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toContain(
        'Content appears to be accurate and compliant. No issues detected.'
      );
      expect(result.processingTime).toBe(250);
    });

    it('should process results with issues', async () => {
      const moduleResultsWithIssues: ValidationResult[] = [
        {
          moduleId: 'legal',
          issues: [
            {
              id: 'issue-1',
              type: 'factual_error',
              severity: 'high',
              location: { start: 0, end: 10, line: 1, column: 1 },
              description: 'Test factual error',
              evidence: ['Test evidence'],
              confidence: 85,
              moduleSource: 'legal',
            },
          ],
          confidence: 70,
          processingTime: 100,
          metadata: {},
        },
      ];

      const result = await processor.processResults(
        'test-verification-2',
        mockRequest,
        moduleResultsWithIssues,
        200
      );

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].moduleSource).toBe('legal');
      expect(result.overallConfidence).toBe(70);
      expect(result.riskLevel).toBe('high');
      expect(result.recommendations).toContain(
        '1 factual error(s) detected. Review and verify against authoritative sources.'
      );
    });

    it('should apply confidence weighting for different domains', async () => {
      const financialRequest = {
        ...mockRequest,
        domain: 'financial' as Domain,
      };

      const result = await processor.processResults(
        'test-verification-3',
        financialRequest,
        mockModuleResults,
        200
      );

      // Financial domain has 1.2 weight, so confidence should be higher
      expect(result.overallConfidence).toBeGreaterThan(93);
    });

    it('should sort issues by severity and confidence', async () => {
      const moduleResultsWithMultipleIssues: ValidationResult[] = [
        {
          moduleId: 'test',
          issues: [
            {
              id: 'issue-1',
              type: 'factual_error',
              severity: 'low',
              location: { start: 0, end: 10, line: 1, column: 1 },
              description: 'Low severity issue',
              evidence: [],
              confidence: 90,
              moduleSource: 'test',
            },
            {
              id: 'issue-2',
              type: 'compliance_violation',
              severity: 'critical',
              location: { start: 10, end: 20, line: 1, column: 11 },
              description: 'Critical issue',
              evidence: [],
              confidence: 95,
              moduleSource: 'test',
            },
            {
              id: 'issue-3',
              type: 'logical_inconsistency',
              severity: 'medium',
              location: { start: 20, end: 30, line: 1, column: 21 },
              description: 'Medium severity issue',
              evidence: [],
              confidence: 85,
              moduleSource: 'test',
            },
          ],
          confidence: 60,
          processingTime: 100,
          metadata: {},
        },
      ];

      const result = await processor.processResults(
        'test-verification-4',
        mockRequest,
        moduleResultsWithMultipleIssues,
        200
      );

      expect(result.issues).toHaveLength(3);
      expect(result.issues[0].severity).toBe('critical');
      expect(result.issues[1].severity).toBe('medium');
      expect(result.issues[2].severity).toBe('low');
    });

    it('should use cached results when available', async () => {
      // Create processor with caching enabled
      const cachedProcessor = new ResultsProcessor({
        enableCaching: true,
        cacheTtl: 3600,
        enablePersistence: false,
      });

      // First call
      const result1 = await cachedProcessor.processResults(
        'test-verification-5',
        mockRequest,
        mockModuleResults,
        200
      );

      // Second call with same request should use cache
      const result2 = await cachedProcessor.processResults(
        'test-verification-6',
        mockRequest,
        mockModuleResults,
        300
      );

      expect(result2.verificationId).toBe('test-verification-6'); // ID should be updated
      expect(result2.overallConfidence).toBe(
        result1.overallConfidence
      );
      expect(result2.riskLevel).toBe(result1.riskLevel);
    });
  });

  describe('getResult', () => {
    it('should return null for non-existent results', async () => {
      const result = await processor.getResult('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('metrics tracking', () => {
    it('should track processing metrics', async () => {
      await processor.processResults(
        'test-verification-7',
        mockRequest,
        mockModuleResults,
        200
      );

      const metrics = processor.getMetrics();
      expect(metrics.totalProcessed).toBe(1);
      expect(metrics.averageConfidence).toBe(93);
      expect(metrics.riskDistribution.low).toBe(1);
      expect(metrics.averageProcessingTime).toBe(200);
    });

    it('should update metrics for multiple results', async () => {
      // Process first result
      await processor.processResults(
        'test-verification-8',
        mockRequest,
        mockModuleResults,
        200
      );

      // Process second result with different characteristics
      const moduleResultsWithIssues: ValidationResult[] = [
        {
          moduleId: 'test',
          issues: [
            {
              id: 'issue-1',
              type: 'factual_error',
              severity: 'high',
              location: { start: 0, end: 10, line: 1, column: 1 },
              description: 'Test error',
              evidence: [],
              confidence: 80,
              moduleSource: 'test',
            },
          ],
          confidence: 60,
          processingTime: 100,
          metadata: {},
        },
      ];

      await processor.processResults(
        'test-verification-9',
        mockRequest,
        moduleResultsWithIssues,
        300
      );

      const metrics = processor.getMetrics();
      expect(metrics.totalProcessed).toBe(2);
      expect(metrics.averageConfidence).toBe(76.5); // (93 + 60) / 2 = 76.5
      expect(metrics.riskDistribution.low).toBe(1);
      expect(metrics.riskDistribution.high).toBe(1);
      expect(metrics.issueTypeDistribution.factual_error).toBe(1);
      expect(metrics.averageProcessingTime).toBe(250); // (200 + 300) / 2
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = processor.getCacheStats();
      expect(stats).toBeDefined();
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should invalidate cache', async () => {
      await processor.invalidateCache();
      // Should not throw error
    });
  });

  describe('risk level calculation', () => {
    it('should calculate low risk for no issues and high confidence', async () => {
      const result = await processor.processResults(
        'test-verification-10',
        mockRequest,
        mockModuleResults,
        200
      );

      expect(result.riskLevel).toBe('low');
    });

    it('should calculate critical risk for critical issues', async () => {
      const criticalModuleResults: ValidationResult[] = [
        {
          moduleId: 'test',
          issues: [
            {
              id: 'critical-issue',
              type: 'compliance_violation',
              severity: 'critical',
              location: { start: 0, end: 10, line: 1, column: 1 },
              description: 'Critical compliance violation',
              evidence: [],
              confidence: 95,
              moduleSource: 'test',
            },
          ],
          confidence: 80,
          processingTime: 100,
          metadata: {},
        },
      ];

      const result = await processor.processResults(
        'test-verification-11',
        mockRequest,
        criticalModuleResults,
        200
      );

      expect(result.riskLevel).toBe('critical');
    });

    it('should calculate critical risk for very low confidence', async () => {
      const lowConfidenceResults: ValidationResult[] = [
        {
          moduleId: 'test',
          issues: [],
          confidence: 30, // Very low confidence
          processingTime: 100,
          metadata: {},
        },
      ];

      const result = await processor.processResults(
        'test-verification-12',
        mockRequest,
        lowConfidenceResults,
        200
      );

      expect(result.riskLevel).toBe('critical');
    });
  });
});
