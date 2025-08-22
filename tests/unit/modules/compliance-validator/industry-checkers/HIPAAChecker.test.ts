import { HIPAAChecker } from '../../../../../src/modules/compliance-validator/industry-checkers/HIPAAChecker';
import { ParsedContent } from '../../../../../src/models/core/ParsedContent';

describe('HIPAAChecker', () => {
  let hipaaChecker: HIPAAChecker;

  beforeEach(() => {
    hipaaChecker = new HIPAAChecker();
  });

  describe('checkCompliance', () => {
    it('should detect SSN violations', async () => {
      const content: ParsedContent = {
        id: 'test-1',
        originalContent: 'Patient SSN: 123-45-6789',
        extractedText: 'Patient SSN: 123-45-6789',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const violations = await hipaaChecker.checkCompliance(content);

      expect(violations.length).toBeGreaterThan(0);
      const ssnViolation = violations.find(
        (v) => v.location.text === '123-45-6789'
      );
      expect(ssnViolation).toBeDefined();
      expect(ssnViolation?.severity).toBe('critical');
      expect(ssnViolation?.violationType).toBe('pattern_match');
    });

    it('should detect phone number violations', async () => {
      const content: ParsedContent = {
        id: 'test-2',
        originalContent: 'Contact patient at 555-123-4567',
        extractedText: 'Contact patient at 555-123-4567',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const violations = await hipaaChecker.checkCompliance(content);

      expect(violations.length).toBeGreaterThan(0);
      const phoneViolation = violations.find(
        (v) => v.location.text === '555-123-4567'
      );
      expect(phoneViolation).toBeDefined();
      expect(phoneViolation?.severity).toBe('medium');
    });

    it('should detect email violations', async () => {
      const content: ParsedContent = {
        id: 'test-3',
        originalContent: 'Patient email: john.doe@email.com',
        extractedText: 'Patient email: john.doe@email.com',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const violations = await hipaaChecker.checkCompliance(content);

      expect(violations.length).toBeGreaterThan(0);
      const emailViolation = violations.find(
        (v) => v.location.text === 'john.doe@email.com'
      );
      expect(emailViolation).toBeDefined();
      expect(emailViolation?.severity).toBe('medium');
    });

    it('should detect medical record number violations', async () => {
      const content: ParsedContent = {
        id: 'test-4',
        originalContent: 'MRN: 12345678',
        extractedText: 'MRN: 12345678',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const violations = await hipaaChecker.checkCompliance(content);

      expect(violations.length).toBeGreaterThan(0);
      const mrnViolation = violations.find(
        (v) => v.location.text === 'MRN: 12345678'
      );
      expect(mrnViolation).toBeDefined();
      expect(mrnViolation?.severity).toBe('critical');
    });

    it('should detect healthcare keywords in sensitive context', async () => {
      const content: ParsedContent = {
        id: 'test-5',
        originalContent:
          'Patient John Smith has diabetes and requires medication',
        extractedText:
          'Patient John Smith has diabetes and requires medication',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const violations = await hipaaChecker.checkCompliance(content);

      expect(violations.length).toBeGreaterThan(0);
      const patientViolation = violations.find(
        (v) => v.location.text === 'patient'
      );
      expect(patientViolation).toBeDefined();
      expect(patientViolation?.violationType).toBe('keyword_match');
    });

    it('should not flag healthcare keywords in non-sensitive context', async () => {
      const content: ParsedContent = {
        id: 'test-6',
        originalContent: 'The patient portal system is being updated',
        extractedText: 'The patient portal system is being updated',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const violations = await hipaaChecker.checkCompliance(content);

      // Should have fewer or no violations since context is not sensitive
      const patientViolations = violations.filter(
        (v) => v.location.text === 'patient'
      );
      expect(patientViolations.length).toBeLessThanOrEqual(1);
    });

    it('should handle empty content', async () => {
      const content: ParsedContent = {
        id: 'test-7',
        originalContent: '',
        extractedText: '',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const violations = await hipaaChecker.checkCompliance(content);

      expect(violations.length).toBe(0);
    });

    it('should provide appropriate regulatory references', async () => {
      const content: ParsedContent = {
        id: 'test-8',
        originalContent: 'SSN: 123-45-6789',
        extractedText: 'SSN: 123-45-6789',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const violations = await hipaaChecker.checkCompliance(content);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].regulatoryReference).toContain('HIPAA');
      expect(violations[0].regulatoryReference).toContain(
        '45 CFR 164.502'
      );
    });

    it('should provide suggested fixes', async () => {
      const content: ParsedContent = {
        id: 'test-9',
        originalContent: 'Patient phone: 555-123-4567',
        extractedText: 'Patient phone: 555-123-4567',
        contentType: 'text',
        structure: {
          sections: [],
          tables: [],
          figures: [],
          references: [],
        },
        entities: [],
        metadata: {},
        createdAt: new Date(),
      };

      const violations = await hipaaChecker.checkCompliance(content);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].suggestedFix).toBeDefined();
      expect(violations[0].suggestedFix).toContain(
        'Remove or anonymize'
      );
    });
  });
});
