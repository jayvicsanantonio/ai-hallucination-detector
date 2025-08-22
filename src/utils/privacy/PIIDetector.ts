export interface PIIMatch {
  type: PIIType;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export enum PIIType {
  EMAIL = 'email',
  PHONE = 'phone',
  SSN = 'ssn',
  CREDIT_CARD = 'credit_card',
  IP_ADDRESS = 'ip_address',
  NAME = 'name',
  ADDRESS = 'address',
  DATE_OF_BIRTH = 'date_of_birth',
  MEDICAL_ID = 'medical_id',
  BANK_ACCOUNT = 'bank_account',
}

export interface PIIDetectionConfig {
  enabledTypes: PIIType[];
  confidenceThreshold: number;
  customPatterns?: Map<string, RegExp>;
}

export class PIIDetector {
  private readonly config: PIIDetectionConfig;
  private readonly patterns: Map<PIIType, RegExp>;

  constructor(config?: Partial<PIIDetectionConfig>) {
    this.config = {
      enabledTypes: Object.values(PIIType),
      confidenceThreshold: 0.7,
      ...config,
    };

    this.patterns = new Map([
      [
        PIIType.EMAIL,
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      ],
      [
        PIIType.PHONE,
        /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
      ],
      [PIIType.SSN, /\b\d{3}-?\d{2}-?\d{4}\b/g],
      [PIIType.CREDIT_CARD, /\b(?:\d{4}[-\s]?){3}\d{4}\b/g],
      [PIIType.IP_ADDRESS, /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g],
      [
        PIIType.DATE_OF_BIRTH,
        /\b(?:0[1-9]|1[0-2])[-\/](?:0[1-9]|[12]\d|3[01])[-\/](?:19|20)\d{2}\b/g,
      ],
      [PIIType.MEDICAL_ID, /\b[A-Z]{2}\d{8}\b/g],
      [PIIType.BANK_ACCOUNT, /\b\d{8,17}\b/g],
    ]);
  }

  /**
   * Detects PII in the given text
   */
  detectPII(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    for (const type of this.config.enabledTypes) {
      const pattern = this.patterns.get(type);
      if (!pattern) continue;

      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: this.calculateConfidence(type, match[0]),
        });
      }
    }

    // Add name detection using simple heuristics
    if (this.config.enabledTypes.includes(PIIType.NAME)) {
      const nameMatches = this.detectNames(text);
      matches.push(...nameMatches);
    }

    return matches.filter(
      (match) => match.confidence >= this.config.confidenceThreshold
    );
  }

  /**
   * Anonymizes PII in text by replacing with placeholders
   */
  anonymize(
    text: string,
    replacementMap?: Map<PIIType, string>
  ): string {
    const defaultReplacements = new Map([
      [PIIType.EMAIL, '[EMAIL]'],
      [PIIType.PHONE, '[PHONE]'],
      [PIIType.SSN, '[SSN]'],
      [PIIType.CREDIT_CARD, '[CREDIT_CARD]'],
      [PIIType.IP_ADDRESS, '[IP_ADDRESS]'],
      [PIIType.NAME, '[NAME]'],
      [PIIType.ADDRESS, '[ADDRESS]'],
      [PIIType.DATE_OF_BIRTH, '[DOB]'],
      [PIIType.MEDICAL_ID, '[MEDICAL_ID]'],
      [PIIType.BANK_ACCOUNT, '[BANK_ACCOUNT]'],
    ]);

    const replacements = replacementMap || defaultReplacements;
    const matches = this.detectPII(text);

    // Sort matches by start position in descending order to avoid index shifting
    matches.sort((a, b) => b.start - a.start);

    let anonymizedText = text;
    for (const match of matches) {
      const replacement =
        replacements.get(match.type) || '[REDACTED]';
      anonymizedText =
        anonymizedText.slice(0, match.start) +
        replacement +
        anonymizedText.slice(match.end);
    }

    return anonymizedText;
  }

  /**
   * Masks PII by showing only partial information
   */
  mask(text: string): string {
    const matches = this.detectPII(text);
    matches.sort((a, b) => b.start - a.start);

    let maskedText = text;
    for (const match of matches) {
      const masked = this.maskValue(match.type, match.value);
      maskedText =
        maskedText.slice(0, match.start) +
        masked +
        maskedText.slice(match.end);
    }

    return maskedText;
  }

  private detectNames(text: string): PIIMatch[] {
    // Simple name detection using capitalization patterns
    const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const matches: PIIMatch[] = [];

    let match;
    while ((match = namePattern.exec(text)) !== null) {
      // Skip common false positives
      const value = match[0];
      if (this.isLikelyName(value)) {
        matches.push({
          type: PIIType.NAME,
          value,
          start: match.index,
          end: match.index + value.length,
          confidence: 0.7,
        });
      }
    }

    return matches;
  }

  private isLikelyName(value: string): boolean {
    const commonWords = [
      'The',
      'And',
      'For',
      'New',
      'Old',
      'Big',
      'Small',
    ];
    const words = value.split(' ');

    // Skip if contains common non-name words
    for (const word of words) {
      if (commonWords.includes(word)) {
        return false;
      }
    }

    return true;
  }

  private calculateConfidence(type: PIIType, value: string): number {
    switch (type) {
      case PIIType.EMAIL:
        return value.includes('@') && value.includes('.')
          ? 0.95
          : 0.7;
      case PIIType.PHONE:
        return value.replace(/\D/g, '').length === 10 ? 0.9 : 0.7;
      case PIIType.SSN:
        return value.replace(/\D/g, '').length === 9 ? 0.95 : 0.8;
      case PIIType.CREDIT_CARD:
        return this.isValidCreditCard(value) ? 0.9 : 0.6;
      default:
        return 0.8;
    }
  }

  private maskValue(type: PIIType, value: string): string {
    switch (type) {
      case PIIType.EMAIL:
        const [local, domain] = value.split('@');
        return `${local.charAt(0)}***@${domain}`;
      case PIIType.PHONE:
        return value.replace(/\d(?=\d{4})/g, '*');
      case PIIType.SSN:
        return value.replace(/\d(?=\d{4})/g, '*');
      case PIIType.CREDIT_CARD:
        return value.replace(/\d(?=\d{4})/g, '*');
      default:
        return '*'.repeat(value.length);
    }
  }

  private isValidCreditCard(value: string): boolean {
    // Simple Luhn algorithm check
    const digits = value.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }
}

export const piiDetector = new PIIDetector();
