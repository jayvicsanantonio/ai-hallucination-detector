import {
  VerificationResult,
  Issue,
  VerificationResultValidator,
  ModelFactory,
  ModelSerializer,
  ValidationError,
} from '../../../../src/models/core';

describe('VerificationResult Model', () => {
  describe('VerificationResultValidator', () => {
    const validVerificationResult: VerificationResult = {
      verificationId: 'test-verification-123',
      overallConfidence: 85,
      riskLevel: 'medium',
      issues: [],
      auditTrail: [],
      processingTime: 1500,
      recommendations: ['Review section 2', 'Check compliance'],
      timestamp: new Date(),
    };

    it('should validate a valid VerificationResult object', () => {
      expect(() =>
        VerificationResultValidator.validate(validVerificationResult)
      ).not.toThrow();
    });

    it('should throw ValidationError for missing verificationId', () => {
      const invalid = {
        ...validVerificationResult,
        verificationId: '',
      };
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow(ValidationError);
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow(
        'VerificationResult must have a valid verificationId'
      );
    });

    it('should throw ValidationError for invalid overallConfidence', () => {
      const invalid = {
        ...validVerificationResult,
        overallConfidence: 150,
      };
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow(ValidationError);
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow(
        'VerificationResult overallConfidence must be between 0 and 100'
      );
    });

    it('should throw ValidationError for negative overallConfidence', () => {
      const invalid = {
        ...validVerificationResult,
        overallConfidence: -10,
      };
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid riskLevel', () => {
      const invalid = {
        ...validVerificationResult,
        riskLevel: 'invalid' as any,
      };
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow(ValidationError);
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow('VerificationResult must have a valid riskLevel');
    });

    it('should throw ValidationError for negative processingTime', () => {
      const invalid = {
        ...validVerificationResult,
        processingTime: -100,
      };
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow(ValidationError);
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow(
        'VerificationResult processingTime must be a non-negative number'
      );
    });

    it('should throw ValidationError for invalid timestamp', () => {
      const invalid = {
        ...validVerificationResult,
        timestamp: 'not-a-date' as any,
      };
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow(ValidationError);
      expect(() =>
        VerificationResultValidator.validate(invalid)
      ).toThrow('VerificationResult must have a valid timestamp');
    });

    it('should validate issues array', () => {
      const validIssue: Issue = {
        id: 'issue-123',
        type: 'factual_error',
        severity: 'high',
        location: { start: 10, end: 20 },
        description: 'Factual error detected',
        evidence: ['Evidence 1', 'Evidence 2'],
        suggestedFix: 'Suggested fix',
        confidence: 0.9,
        moduleSource: 'fact-checker',
      };

      const resultWithIssues = {
        ...validVerificationResult,
        issues: [validIssue],
      };

      expect(() =>
        VerificationResultValidator.validate(resultWithIssues)
      ).not.toThrow();
    });

    it('should throw ValidationError for invalid issue type', () => {
      const invalidIssue: Issue = {
        id: 'issue-123',
        type: 'invalid' as any,
        severity: 'high',
        location: { start: 10, end: 20 },
        description: 'Invalid issue',
        evidence: [],
        confidence: 0.9,
        moduleSource: 'test',
      };

      const resultWithInvalidIssue = {
        ...validVerificationResult,
        issues: [invalidIssue],
      };

      expect(() =>
        VerificationResultValidator.validate(resultWithInvalidIssue)
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid issue confidence', () => {
      const invalidIssue: Issue = {
        id: 'issue-123',
        type: 'factual_error',
        severity: 'high',
        location: { start: 10, end: 20 },
        description: 'Issue with invalid confidence',
        evidence: [],
        confidence: 2.0, // Invalid: > 1
        moduleSource: 'test',
      };

      const resultWithInvalidIssue = {
        ...validVerificationResult,
        issues: [invalidIssue],
      };

      expect(() =>
        VerificationResultValidator.validate(resultWithInvalidIssue)
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid text location in issue', () => {
      const invalidIssue: Issue = {
        id: 'issue-123',
        type: 'factual_error',
        severity: 'high',
        location: { start: 20, end: 10 }, // Invalid: end < start
        description: 'Issue with invalid location',
        evidence: [],
        confidence: 0.9,
        moduleSource: 'test',
      };

      const resultWithInvalidIssue = {
        ...validVerificationResult,
        issues: [invalidIssue],
      };

      expect(() =>
        VerificationResultValidator.validate(resultWithInvalidIssue)
      ).toThrow(ValidationError);
    });

    it('should validate recommendations array', () => {
      const resultWithRecommendations = {
        ...validVerificationResult,
        recommendations: ['Recommendation 1', 'Recommendation 2'],
      };

      expect(() =>
        VerificationResultValidator.validate(
          resultWithRecommendations
        )
      ).not.toThrow();
    });

    it('should throw ValidationError for non-string recommendations', () => {
      const resultWithInvalidRecommendations = {
        ...validVerificationResult,
        recommendations: ['Valid recommendation', 123 as any],
      };

      expect(() =>
        VerificationResultValidator.validate(
          resultWithInvalidRecommendations
        )
      ).toThrow(ValidationError);
    });
  });

  describe('ModelFactory', () => {
    it('should create valid VerificationResult with minimal data', () => {
      const result = ModelFactory.createVerificationResult({});

      expect(result.verificationId).toBeDefined();
      expect(result.overallConfidence).toBe(0);
      expect(result.riskLevel).toBe('low');
      expect(result.issues).toEqual([]);
      expect(result.auditTrail).toEqual([]);
      expect(result.processingTime).toBe(0);
      expect(result.recommendations).toEqual([]);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should create valid VerificationResult with full data', () => {
      const inputData: Partial<VerificationResult> = {
        verificationId: 'custom-verification-id',
        overallConfidence: 75,
        riskLevel: 'high',
        processingTime: 2000,
        recommendations: ['Custom recommendation'],
      };

      const result = ModelFactory.createVerificationResult(inputData);

      expect(result.verificationId).toBe('custom-verification-id');
      expect(result.overallConfidence).toBe(75);
      expect(result.riskLevel).toBe('high');
      expect(result.processingTime).toBe(2000);
      expect(result.recommendations).toEqual([
        'Custom recommendation',
      ]);
    });

    it('should create valid Issue with minimal data', () => {
      const issue = ModelFactory.createIssue({
        description: 'Test issue',
        moduleSource: 'test-module',
      });

      expect(issue.id).toBeDefined();
      expect(issue.type).toBe('factual_error');
      expect(issue.severity).toBe('low');
      expect(issue.description).toBe('Test issue');
      expect(issue.moduleSource).toBe('test-module');
      expect(issue.confidence).toBe(0);
      expect(issue.location).toEqual({ start: 0, end: 0 });
    });

    it('should create valid Issue with full data', () => {
      const inputData: Partial<Issue> = {
        id: 'custom-issue-id',
        type: 'compliance_violation',
        severity: 'critical',
        location: { start: 100, end: 200 },
        description: 'Critical compliance issue',
        evidence: ['Evidence A', 'Evidence B'],
        suggestedFix: 'Fix suggestion',
        confidence: 0.95,
        moduleSource: 'compliance-validator',
      };

      const issue = ModelFactory.createIssue(inputData);

      expect(issue.id).toBe('custom-issue-id');
      expect(issue.type).toBe('compliance_violation');
      expect(issue.severity).toBe('critical');
      expect(issue.location).toEqual({ start: 100, end: 200 });
      expect(issue.description).toBe('Critical compliance issue');
      expect(issue.evidence).toEqual(['Evidence A', 'Evidence B']);
      expect(issue.suggestedFix).toBe('Fix suggestion');
      expect(issue.confidence).toBe(0.95);
      expect(issue.moduleSource).toBe('compliance-validator');
    });

    it('should throw ValidationError for invalid VerificationResult data', () => {
      expect(() =>
        ModelFactory.createVerificationResult({
          overallConfidence: 150, // Invalid
        })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid Issue data', () => {
      expect(() =>
        ModelFactory.createIssue({
          type: 'invalid' as any,
        })
      ).toThrow(ValidationError);
    });
  });

  describe('ModelSerializer', () => {
    const testResult: VerificationResult = {
      verificationId: 'test-verification',
      overallConfidence: 80,
      riskLevel: 'medium',
      issues: [
        {
          id: 'issue-1',
          type: 'factual_error',
          severity: 'high',
          location: { start: 0, end: 10 },
          description: 'Test issue',
          evidence: ['evidence'],
          confidence: 0.9,
          moduleSource: 'test',
        },
      ],
      auditTrail: [],
      processingTime: 1000,
      recommendations: ['Test recommendation'],
      timestamp: new Date('2023-01-01'),
    };

    it('should serialize and deserialize VerificationResult correctly', () => {
      const serialized =
        ModelSerializer.serializeVerificationResult(testResult);
      const deserialized =
        ModelSerializer.deserializeVerificationResult(serialized);

      expect(deserialized).toEqual(testResult);
      expect(deserialized.timestamp).toBeInstanceOf(Date);
    });

    it('should throw ValidationError when deserializing invalid data', () => {
      const invalidJson = JSON.stringify({
        verificationId: '',
        overallConfidence: 150,
      });

      expect(() =>
        ModelSerializer.deserializeVerificationResult(invalidJson)
      ).toThrow(ValidationError);
    });
  });
});
