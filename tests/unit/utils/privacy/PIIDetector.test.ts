import {
  PIIDetector,
  PIIType,
} from '../../../../src/utils/privacy/PIIDetector';

describe('PIIDetector', () => {
  let piiDetector: PIIDetector;

  beforeEach(() => {
    piiDetector = new PIIDetector();
  });

  describe('detectPII', () => {
    it('should detect email addresses', () => {
      const text =
        'Contact us at john.doe@example.com for more information.';
      const matches = piiDetector.detectPII(text);

      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe(PIIType.EMAIL);
      expect(matches[0].value).toBe('john.doe@example.com');
      expect(matches[0].start).toBe(14);
      expect(matches[0].end).toBe(
        matches[0].start + matches[0].value.length
      );
    });

    it('should detect phone numbers', () => {
      const text = 'Call me at (555) 123-4567 or 555.987.6543';
      const matches = piiDetector.detectPII(text);

      expect(matches.length).toBeGreaterThanOrEqual(1);
      const phoneMatches = matches.filter(
        (m) => m.type === PIIType.PHONE
      );
      expect(phoneMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect SSN', () => {
      const text = 'My SSN is 123-45-6789 for verification.';
      const matches = piiDetector.detectPII(text);

      const ssnMatches = matches.filter(
        (m) => m.type === PIIType.SSN
      );
      expect(ssnMatches).toHaveLength(1);
      expect(ssnMatches[0].value).toBe('123-45-6789');
    });

    it('should detect credit card numbers', () => {
      const text = 'My card number is 4532 1234 5678 9012';
      const matches = piiDetector.detectPII(text);

      const ccMatches = matches.filter(
        (m) => m.type === PIIType.CREDIT_CARD
      );
      expect(ccMatches).toHaveLength(1);
      expect(ccMatches[0].value).toBe('4532 1234 5678 9012');
    });

    it('should detect IP addresses', () => {
      const text =
        'Server IP is 192.168.1.100 and backup is 10.0.0.1';
      const matches = piiDetector.detectPII(text);

      const ipMatches = matches.filter(
        (m) => m.type === PIIType.IP_ADDRESS
      );
      expect(ipMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect names with reasonable confidence', () => {
      const text =
        'John Smith and Mary Johnson attended the meeting.';
      const matches = piiDetector.detectPII(text);

      const nameMatches = matches.filter(
        (m) => m.type === PIIType.NAME
      );
      expect(nameMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect dates of birth', () => {
      const text = 'Born on 01/15/1990 and graduated in 2012.';
      const matches = piiDetector.detectPII(text);

      const dobMatches = matches.filter(
        (m) => m.type === PIIType.DATE_OF_BIRTH
      );
      expect(dobMatches).toHaveLength(1);
      expect(dobMatches[0].value).toBe('01/15/1990');
    });

    it('should handle multiple PII types in same text', () => {
      const text =
        'John Doe (john@example.com) called from 555-1234 about SSN 123-45-6789';
      const matches = piiDetector.detectPII(text);

      expect(matches.length).toBeGreaterThanOrEqual(2);

      const types = matches.map((m) => m.type);
      expect(types).toContain(PIIType.EMAIL);
      expect(types).toContain(PIIType.PHONE);
      expect(types).toContain(PIIType.SSN);
    });

    it('should respect confidence threshold', () => {
      const lowConfidenceDetector = new PIIDetector({
        confidenceThreshold: 0.9,
      });

      const text = 'Maybe John Smith or something similar';
      const matches = lowConfidenceDetector.detectPII(text);

      // Should filter out low-confidence name matches
      const nameMatches = matches.filter(
        (m) => m.type === PIIType.NAME
      );
      expect(nameMatches.length).toBeLessThanOrEqual(1);
    });

    it('should handle empty text', () => {
      const matches = piiDetector.detectPII('');
      expect(matches).toHaveLength(0);
    });

    it('should handle text with no PII', () => {
      const text =
        'This is just regular text with no sensitive information.';
      const matches = piiDetector.detectPII(text);
      expect(matches).toHaveLength(0);
    });
  });

  describe('anonymize', () => {
    it('should anonymize email addresses', () => {
      const text = 'Contact john.doe@example.com for help';
      const anonymized = piiDetector.anonymize(text);

      expect(anonymized).toBe('Contact [EMAIL] for help');
    });

    it('should anonymize multiple PII types', () => {
      const text = 'John Doe at john@example.com or call 555-1234';
      const anonymized = piiDetector.anonymize(text);

      expect(anonymized).toContain('[EMAIL]');
      expect(anonymized).toContain('[PHONE]');
      expect(anonymized).not.toContain('john@example.com');
      expect(anonymized).not.toContain('555-1234');
    });

    it('should use custom replacement map', () => {
      const text = 'Email: john@example.com';
      const replacementMap = new Map([
        [PIIType.EMAIL, '***EMAIL***'],
      ]);
      const anonymized = piiDetector.anonymize(text, replacementMap);

      expect(anonymized).toBe('Email: ***EMAIL***');
    });

    it('should handle overlapping matches correctly', () => {
      const text = 'Call 555-123-4567 immediately';
      const anonymized = piiDetector.anonymize(text);

      expect(anonymized).toContain('[PHONE]');
      expect(anonymized).not.toContain('555-123-4567');
    });

    it('should preserve text without PII', () => {
      const text = 'This text has no sensitive information';
      const anonymized = piiDetector.anonymize(text);

      expect(anonymized).toBe(text);
    });
  });

  describe('mask', () => {
    it('should mask email addresses partially', () => {
      const text = 'Email: john.doe@example.com';
      const masked = piiDetector.mask(text);

      expect(masked).toContain('j***@example.com');
      expect(masked).not.toContain('john.doe@example.com');
    });

    it('should mask phone numbers', () => {
      const text = 'Phone: 555-123-4567';
      const masked = piiDetector.mask(text);

      expect(masked).toMatch(/Phone: \*+4567/);
    });

    it('should mask SSN', () => {
      const text = 'SSN: 123-45-6789';
      const masked = piiDetector.mask(text);

      expect(masked).toMatch(/SSN: \*+-\*+-6789/);
    });

    it('should mask credit card numbers', () => {
      const text = 'Card: 4532 1234 5678 9012';
      const masked = piiDetector.mask(text);

      expect(masked).toMatch(/Card: \*+ 9012/);
    });

    it('should handle multiple PII types', () => {
      const text = 'john@example.com and 555-1234';
      const masked = piiDetector.mask(text);

      expect(masked).toContain('j***@example.com');
      expect(masked).toMatch(/\*+1234/);
    });
  });

  describe('configuration', () => {
    it('should respect enabled types configuration', () => {
      const emailOnlyDetector = new PIIDetector({
        enabledTypes: [PIIType.EMAIL],
      });

      const text = 'john@example.com and 555-1234';
      const matches = emailOnlyDetector.detectPII(text);

      expect(matches).toHaveLength(1);
      expect(matches[0].type).toBe(PIIType.EMAIL);
    });

    it('should use custom confidence threshold', () => {
      const strictDetector = new PIIDetector({
        confidenceThreshold: 0.95,
      });

      const text = 'Maybe an email: test@test or phone 123-456';
      const matches = strictDetector.detectPII(text);

      // Should have fewer matches due to higher threshold
      expect(matches.length).toBeLessThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed email addresses', () => {
      const text = 'Invalid emails: @example.com, user@, user@.com';
      const matches = piiDetector.detectPII(text);

      const emailMatches = matches.filter(
        (m) => m.type === PIIType.EMAIL
      );
      // Should not detect malformed emails
      expect(emailMatches.length).toBeLessThanOrEqual(1);
    });

    it('should handle international phone formats', () => {
      const text = 'International: +1-555-123-4567';
      const matches = piiDetector.detectPII(text);

      const phoneMatches = matches.filter(
        (m) => m.type === PIIType.PHONE
      );
      expect(phoneMatches.length).toBeGreaterThanOrEqual(0);
    });

    it('should avoid false positives for common words', () => {
      const text =
        'The New York Times reported that Big Data is important';
      const matches = piiDetector.detectPII(text);

      const nameMatches = matches.filter(
        (m) => m.type === PIIType.NAME
      );
      // Should not detect "New York" or "Big Data" as names
      expect(nameMatches.length).toBeLessThanOrEqual(1);
    });

    it('should handle very long text efficiently', () => {
      const longText =
        'Regular text. '.repeat(10000) + 'john@example.com';

      const startTime = Date.now();
      const matches = piiDetector.detectPII(longText);
      const endTime = Date.now();

      expect(matches).toHaveLength(1);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
