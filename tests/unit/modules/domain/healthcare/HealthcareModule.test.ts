import { HealthcareModule } from '@/modules/domain/healthcare/HealthcareModule';
import { ParsedContent } from '@/models/core/ParsedContent';
import { FeedbackData } from '@/models/audit/FeedbackData';
import { DomainRule } from '@/modules/interfaces/DomainModule';

describe('HealthcareModule', () => {
  let healthcareModule: HealthcareModule;
  let mockContent: ParsedContent;

  beforeEach(() => {
    healthcareModule = new HealthcareModule();
    mockContent = {
      id: 'test-content-1',
      originalContent: 'Test healthcare content',
      extractedText:
        'Patient diagnosed with pneumonia. Prescribed Amoxicillin 500 mg twice daily. Blood pressure: 120/80 mmHg.',
      contentType: 'text',
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: {
        wordCount: 15,
        characterCount: 100,
      },
      createdAt: new Date(),
    };
  });

  describe('validateContent', () => {
    it('should validate healthcare content and return results', async () => {
      const result = await healthcareModule.validateContent(
        mockContent
      );

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('healthcare-module');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should detect medical data in content', async () => {
      const contentWithMedicalData = {
        ...mockContent,
        extractedText:
          'Patient John Doe (MRN: 123456) has diabetes. Prescribed Metformin 500 mg daily. Temperature: 98.6°F.',
      };

      const result = await healthcareModule.validateContent(
        contentWithMedicalData
      );

      expect(result.metadata?.medicalDataFound).toBeGreaterThan(0);
    });

    it('should identify HIPAA compliance issues', async () => {
      const contentWithPII = {
        ...mockContent,
        extractedText:
          'Patient John Smith, SSN: 123-45-6789, phone: 555-123-4567, has been diagnosed with diabetes.',
      };

      const result = await healthcareModule.validateContent(
        contentWithPII
      );

      expect(result.issues.length).toBeGreaterThan(0);
      expect(
        result.issues.some((issue) =>
          issue.description.includes('PII exposure')
        )
      ).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      const invalidContent = {
        ...mockContent,
        extractedText: null as any,
      };

      const result = await healthcareModule.validateContent(
        invalidContent
      );

      expect(result.confidence).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('compliance_violation');
    });
  });

  describe('updateRules', () => {
    it('should update domain rules successfully', async () => {
      const newRules: DomainRule[] = [
        {
          id: 'test-rule-1',
          name: 'test-healthcare-rule',
          description: 'Test rule for healthcare validation',
          severity: 'medium',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await expect(
        healthcareModule.updateRules(newRules)
      ).resolves.not.toThrow();
    });
  });

  describe('learnFromFeedback', () => {
    it('should process feedback for learning', async () => {
      const feedback: FeedbackData = {
        verificationId: 'test-verification-1',
        userFeedback: 'incorrect',
        corrections:
          'The dosage should be validated against FDA guidelines',
        userId: 'test-user',
        timestamp: new Date(),
      };

      await expect(
        healthcareModule.learnFromFeedback(feedback)
      ).resolves.not.toThrow();
    });
  });

  describe('getModuleInfo', () => {
    it('should return correct module information', () => {
      const info = healthcareModule.getModuleInfo();

      expect(info.name).toBe('Healthcare Domain Module');
      expect(info.domain).toBe('healthcare');
      expect(info.version).toBe('1.0.0');
      expect(info.capabilities).toContain(
        'Medical accuracy validation'
      );
      expect(info.capabilities).toContain(
        'HIPAA compliance checking'
      );
      expect(info.capabilities).toContain(
        'Medical terminology and dosage validation'
      );
    });
  });

  describe('validateMedicalAccuracy', () => {
    it('should validate medical accuracy', async () => {
      const content =
        'Patient has pneumonia and is prescribed Amoxicillin 500 mg twice daily.';

      const result = await healthcareModule.validateMedicalAccuracy(
        content
      );

      expect(result).toBeDefined();
      expect(result.moduleId).toBe('medical-accuracy-validator');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect unknown medications', async () => {
      const content =
        'Patient is prescribed Fakemedicin 1000 mg daily.';

      const result = await healthcareModule.validateMedicalAccuracy(
        content
      );

      expect(result.issues.length).toBeGreaterThan(0);
      expect(
        result.issues.some((issue) =>
          issue.description.includes(
            'Unknown or potentially misspelled medication'
          )
        )
      ).toBe(true);
    });
  });

  describe('checkHIPAACompliance', () => {
    it('should check HIPAA compliance', async () => {
      const content =
        'This document includes patient privacy notice and describes protected health information handling.';

      const result = await healthcareModule.checkHIPAACompliance(
        content
      );

      expect(result).toBeDefined();
      expect(result.checkedRules).toBeDefined();
      expect(typeof result.isCompliant).toBe('boolean');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect HIPAA violations', async () => {
      const content =
        'Patient John Smith, SSN: 123-45-6789, has diabetes.';

      const result = await healthcareModule.checkHIPAACompliance(
        content
      );

      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('domain property', () => {
    it('should have correct domain', () => {
      expect(healthcareModule.domain).toBe('healthcare');
    });
  });

  describe('version property', () => {
    it('should have version defined', () => {
      expect(healthcareModule.version).toBeDefined();
      expect(typeof healthcareModule.version).toBe('string');
    });
  });

  describe('medical data extraction', () => {
    it('should extract medications and dosages', async () => {
      const contentWithMedications = {
        ...mockContent,
        extractedText:
          'Prescribed Lisinopril 10 mg daily and Metformin 500 mg twice daily.',
      };

      const result = await healthcareModule.validateContent(
        contentWithMedications
      );

      expect(result.metadata?.medicalDataFound).toBeGreaterThan(0);
    });

    it('should extract vital signs', async () => {
      const contentWithVitals = {
        ...mockContent,
        extractedText:
          'Blood pressure: 140/90 mmHg, heart rate: 72 bpm, temperature: 98.6°F, weight: 70 kg.',
      };

      const result = await healthcareModule.validateContent(
        contentWithVitals
      );

      expect(result.metadata?.medicalDataFound).toBeGreaterThan(0);
    });

    it('should extract medical conditions', async () => {
      const contentWithConditions = {
        ...mockContent,
        extractedText:
          'Diagnosis: Type 2 diabetes mellitus. Condition: Hypertension.',
      };

      const result = await healthcareModule.validateContent(
        contentWithConditions
      );

      expect(result.metadata?.medicalDataFound).toBeGreaterThan(0);
    });

    it('should extract patient identifiers', async () => {
      const contentWithIds = {
        ...mockContent,
        extractedText:
          'Patient ID: 987654, MRN: 123456 has been admitted.',
      };

      const result = await healthcareModule.validateContent(
        contentWithIds
      );

      expect(result.metadata?.medicalDataFound).toBeGreaterThan(0);
    });
  });
});
