import {
  FeedbackData,
  FeedbackDataValidator,
  AuditModelFactory,
  AuditModelSerializer,
  AuditValidationError,
} from '../../../../src/models/audit';

describe('FeedbackData Model', () => {
  describe('FeedbackDataValidator', () => {
    const validFeedback: FeedbackData = {
      verificationId: 'verification-123',
      userFeedback: 'correct',
      userId: 'user-456',
      timestamp: new Date(),
    };

    it('should validate a valid FeedbackData', () => {
      expect(() =>
        FeedbackDataValidator.validate(validFeedback)
      ).not.toThrow();
    });

    it('should throw AuditValidationError for missing verificationId', () => {
      const invalid = { ...validFeedback, verificationId: '' };
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        'FeedbackData must have a valid verificationId'
      );
    });

    it('should throw AuditValidationError for invalid userFeedback', () => {
      const invalid = {
        ...validFeedback,
        userFeedback: 'invalid' as any,
      };
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        'FeedbackData must have a valid userFeedback'
      );
    });

    it('should throw AuditValidationError for missing userId', () => {
      const invalid = { ...validFeedback, userId: '' };
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        'FeedbackData must have a valid userId'
      );
    });

    it('should throw AuditValidationError for invalid timestamp', () => {
      const invalid = {
        ...validFeedback,
        timestamp: 'not-a-date' as any,
      };
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        'FeedbackData must have a valid timestamp'
      );
    });

    it('should throw AuditValidationError for invalid confidence', () => {
      const invalid = { ...validFeedback, confidence: 1.5 };
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        'FeedbackData confidence must be between 0 and 1'
      );
    });

    it('should throw AuditValidationError for negative confidence', () => {
      const invalid = { ...validFeedback, confidence: -0.1 };
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
    });

    it('should throw AuditValidationError for partial feedback without corrections', () => {
      const invalid = {
        ...validFeedback,
        userFeedback: 'partially_correct' as any,
      };
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        'Partial feedback must include corrections'
      );
    });

    it('should validate partial feedback with corrections', () => {
      const partialFeedback = {
        ...validFeedback,
        userFeedback: 'partially_correct' as any,
        corrections:
          'The date should be 2023-01-01 instead of 2022-01-01',
      };

      expect(() =>
        FeedbackDataValidator.validate(partialFeedback)
      ).not.toThrow();
    });

    it('should throw AuditValidationError for incorrect feedback without corrections or notes', () => {
      const invalid = {
        ...validFeedback,
        userFeedback: 'incorrect' as any,
      };
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        AuditValidationError
      );
      expect(() => FeedbackDataValidator.validate(invalid)).toThrow(
        'Incorrect feedback must include corrections or expert notes'
      );
    });

    it('should validate incorrect feedback with corrections', () => {
      const incorrectFeedback = {
        ...validFeedback,
        userFeedback: 'incorrect' as any,
        corrections: 'This information is completely wrong',
      };

      expect(() =>
        FeedbackDataValidator.validate(incorrectFeedback)
      ).not.toThrow();
    });

    it('should validate incorrect feedback with expert notes', () => {
      const incorrectFeedback = {
        ...validFeedback,
        userFeedback: 'incorrect' as any,
        expertNotes: 'This violates regulation XYZ section 4.2',
      };

      expect(() =>
        FeedbackDataValidator.validate(incorrectFeedback)
      ).not.toThrow();
    });

    it('should validate feedback with all optional fields', () => {
      const completeFeedback: FeedbackData = {
        verificationId: 'verification-123',
        userFeedback: 'incorrect',
        corrections: 'Corrected information here',
        expertNotes: 'Expert analysis of the issue',
        userId: 'user-456',
        timestamp: new Date(),
        issueId: 'issue-789',
        confidence: 0.95,
      };

      expect(() =>
        FeedbackDataValidator.validate(completeFeedback)
      ).not.toThrow();
    });
  });

  describe('AuditModelFactory', () => {
    it('should create valid FeedbackData with minimal data', () => {
      const feedback = AuditModelFactory.createFeedbackData({
        verificationId: 'verification-123',
        userId: 'user-456',
      });

      expect(feedback.verificationId).toBe('verification-123');
      expect(feedback.userId).toBe('user-456');
      expect(feedback.userFeedback).toBe('correct');
      expect(feedback.timestamp).toBeInstanceOf(Date);
    });

    it('should create valid FeedbackData with full data', () => {
      const inputData: Partial<FeedbackData> = {
        verificationId: 'verification-123',
        userFeedback: 'partially_correct',
        corrections: 'Some corrections needed',
        expertNotes: 'Expert review notes',
        userId: 'user-456',
        issueId: 'issue-789',
        confidence: 0.8,
      };

      const feedback =
        AuditModelFactory.createFeedbackData(inputData);

      expect(feedback.verificationId).toBe('verification-123');
      expect(feedback.userFeedback).toBe('partially_correct');
      expect(feedback.corrections).toBe('Some corrections needed');
      expect(feedback.expertNotes).toBe('Expert review notes');
      expect(feedback.userId).toBe('user-456');
      expect(feedback.issueId).toBe('issue-789');
      expect(feedback.confidence).toBe(0.8);
      expect(feedback.timestamp).toBeInstanceOf(Date);
    });

    it('should throw AuditValidationError for invalid data', () => {
      expect(() =>
        AuditModelFactory.createFeedbackData({
          verificationId: 'verification-123',
          userFeedback: 'partially_correct',
          userId: 'user-456',
          // Missing corrections for partial feedback
        })
      ).toThrow(AuditValidationError);
    });

    it('should throw AuditValidationError for invalid feedback type', () => {
      expect(() =>
        AuditModelFactory.createFeedbackData({
          verificationId: 'verification-123',
          userFeedback: 'invalid' as any,
          userId: 'user-456',
        })
      ).toThrow(AuditValidationError);
    });
  });

  describe('AuditModelSerializer', () => {
    const testFeedback: FeedbackData = {
      verificationId: 'verification-123',
      userFeedback: 'incorrect',
      corrections: 'The amount should be $1000, not $100',
      expertNotes: 'This is a critical financial error',
      userId: 'user-456',
      timestamp: new Date('2023-01-01T15:30:00Z'),
      issueId: 'issue-789',
      confidence: 0.9,
    };

    it('should serialize and deserialize FeedbackData correctly', () => {
      const serialized =
        AuditModelSerializer.serializeFeedbackData(testFeedback);
      const deserialized =
        AuditModelSerializer.deserializeFeedbackData(serialized);

      expect(deserialized).toEqual(testFeedback);
      expect(deserialized.timestamp).toBeInstanceOf(Date);
    });

    it('should throw AuditValidationError when deserializing invalid data', () => {
      const invalidJson = JSON.stringify({
        verificationId: '',
        userFeedback: 'correct',
        userId: 'user-123',
      });

      expect(() =>
        AuditModelSerializer.deserializeFeedbackData(invalidJson)
      ).toThrow(AuditValidationError);
    });

    it('should handle feedback without optional fields', () => {
      const minimalFeedback: FeedbackData = {
        verificationId: 'verification-123',
        userFeedback: 'correct',
        userId: 'user-456',
        timestamp: new Date('2023-01-01T15:30:00Z'),
      };

      const serialized =
        AuditModelSerializer.serializeFeedbackData(minimalFeedback);
      const deserialized =
        AuditModelSerializer.deserializeFeedbackData(serialized);

      expect(deserialized).toEqual(minimalFeedback);
      expect(deserialized.timestamp).toBeInstanceOf(Date);
      expect(deserialized.corrections).toBeUndefined();
      expect(deserialized.expertNotes).toBeUndefined();
      expect(deserialized.issueId).toBeUndefined();
      expect(deserialized.confidence).toBeUndefined();
    });
  });
});
