import {
  KnowledgeBaseUpdater,
  KnowledgeUpdate,
} from '../../../../src/services/learning/KnowledgeBaseUpdater';
import { FeedbackData } from '../../../../src/models/audit/FeedbackData';
import { KnowledgeBaseRepository } from '../../../../src/database/interfaces/KnowledgeBaseRepository';

// Mock dependencies
jest.mock(
  '../../../../src/database/interfaces/KnowledgeBaseRepository'
);
jest.mock('../../../../src/utils/Logger');

describe('KnowledgeBaseUpdater', () => {
  let knowledgeBaseUpdater: KnowledgeBaseUpdater;
  let mockKnowledgeRepository: jest.Mocked<KnowledgeBaseRepository>;

  beforeEach(() => {
    mockKnowledgeRepository =
      new KnowledgeBaseRepository() as jest.Mocked<KnowledgeBaseRepository>;
    knowledgeBaseUpdater = new KnowledgeBaseUpdater(
      mockKnowledgeRepository
    );
  });

  describe('updateFromFeedback', () => {
    const mockVerificationResult = {
      domain: 'legal',
      issues: [
        {
          id: 'issue-1',
          type: 'factual_error',
          description: 'Incorrect percentage',
          evidence: ['source1', 'source2'],
        },
        {
          id: 'issue-2',
          type: 'compliance_violation',
          ruleId: 'rule-123',
          description: 'GDPR violation',
        },
      ],
    };

    it('should process incorrect feedback with corrections', async () => {
      // Arrange
      const feedbackData: FeedbackData = {
        verificationId: 'test-verification-id',
        userFeedback: 'incorrect',
        corrections: 'The correct percentage is 25%',
        expertNotes: 'This is context-dependent',
        userId: 'test-user-id',
        timestamp: new Date(),
        issueId: 'issue-1',
        confidence: 0.9,
      };

      mockKnowledgeRepository.getVerificationResult.mockResolvedValue(
        mockVerificationResult
      );
      mockKnowledgeRepository.createOrUpdateFactualClaim.mockResolvedValue(
        {
          id: 'claim-1',
          statement: 'The correct percentage is 25%',
          sources: [],
          confidence: 0.9,
          domain: 'legal',
          lastVerified: new Date(),
        }
      );

      // Act
      const updates = await knowledgeBaseUpdater.updateFromFeedback(
        feedbackData
      );

      // Assert
      expect(updates).toHaveLength(1);
      expect(updates[0]).toEqual({
        type: 'factual_claim',
        action: 'create',
        confidence: 0.9,
        source: 'user_feedback',
      });

      expect(
        mockKnowledgeRepository.createOrUpdateFactualClaim
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          statement: 'The correct percentage is 25%',
          confidence: 0.9,
          domain: 'legal',
        })
      );
    });

    it('should process correct feedback by reinforcing knowledge', async () => {
      // Arrange
      const feedbackData: FeedbackData = {
        verificationId: 'test-verification-id',
        userFeedback: 'correct',
        userId: 'test-user-id',
        timestamp: new Date(),
        confidence: 0.95,
      };

      mockKnowledgeRepository.getVerificationResult.mockResolvedValue(
        mockVerificationResult
      );
      mockKnowledgeRepository.reinforceFactualClaim.mockResolvedValue();
      mockKnowledgeRepository.reinforceComplianceRule.mockResolvedValue();

      // Act
      const updates = await knowledgeBaseUpdater.updateFromFeedback(
        feedbackData
      );

      // Assert
      expect(updates).toHaveLength(2); // One for each issue type
      expect(
        mockKnowledgeRepository.reinforceFactualClaim
      ).toHaveBeenCalledWith(['source1', 'source2']);
      expect(
        mockKnowledgeRepository.reinforceComplianceRule
      ).toHaveBeenCalledWith('rule-123');
    });

    it('should process partial feedback by creating nuanced rules', async () => {
      // Arrange
      const feedbackData: FeedbackData = {
        verificationId: 'test-verification-id',
        userFeedback: 'partial',
        corrections: 'Partially correct but missing context',
        expertNotes: 'This depends on jurisdiction',
        userId: 'test-user-id',
        timestamp: new Date(),
        confidence: 0.6,
      };

      mockKnowledgeRepository.getVerificationResult.mockResolvedValue(
        mockVerificationResult
      );
      mockKnowledgeRepository.createPatternRule.mockResolvedValue();

      // Act
      const updates = await knowledgeBaseUpdater.updateFromFeedback(
        feedbackData
      );

      // Assert
      expect(updates).toHaveLength(1);
      expect(updates[0]).toEqual({
        type: 'pattern_rule',
        action: 'create',
        confidence: 0.6,
        source: 'user_feedback',
      });

      expect(
        mockKnowledgeRepository.createPatternRule
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: 'partially correct but missing context',
          context: 'This depends on jurisdiction',
          confidence: 0.6,
          domain: 'legal',
        })
      );
    });

    it('should handle missing verification result gracefully', async () => {
      // Arrange
      const feedbackData: FeedbackData = {
        verificationId: 'non-existent-id',
        userFeedback: 'incorrect',
        corrections: 'Some correction',
        userId: 'test-user-id',
        timestamp: new Date(),
      };

      mockKnowledgeRepository.getVerificationResult.mockResolvedValue(
        null
      );

      // Act
      const updates = await knowledgeBaseUpdater.updateFromFeedback(
        feedbackData
      );

      // Assert
      expect(updates).toHaveLength(0);
    });

    it('should handle compliance rule updates', async () => {
      // Arrange
      const feedbackData: FeedbackData = {
        verificationId: 'test-verification-id',
        userFeedback: 'incorrect',
        expertNotes: 'This rule needs updating for new regulations',
        userId: 'test-user-id',
        timestamp: new Date(),
        issueId: 'issue-2',
      };

      const mockComplianceRule = {
        id: 'rule-123',
        ruleText: 'Original rule text',
        regulation: 'GDPR',
        jurisdiction: 'EU',
        domain: 'legal' as const,
        severity: 'high' as const,
        examples: [],
        keywords: [],
        patterns: [],
        lastUpdated: new Date(),
        isActive: true,
      };

      mockKnowledgeRepository.getVerificationResult.mockResolvedValue(
        mockVerificationResult
      );
      mockKnowledgeRepository.findComplianceRuleByIssue.mockResolvedValue(
        mockComplianceRule
      );
      mockKnowledgeRepository.updateComplianceRule.mockResolvedValue({
        ...mockComplianceRule,
        examples: ['This rule needs updating for new regulations'],
      });

      // Act
      const updates = await knowledgeBaseUpdater.updateFromFeedback(
        feedbackData
      );

      // Assert
      expect(updates).toHaveLength(1);
      expect(updates[0].type).toBe('compliance_rule');
      expect(
        mockKnowledgeRepository.updateComplianceRule
      ).toHaveBeenCalledWith(
        'rule-123',
        expect.objectContaining({
          examples: ['This rule needs updating for new regulations'],
        })
      );
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const feedbackData: FeedbackData = {
        verificationId: 'test-verification-id',
        userFeedback: 'incorrect',
        corrections: 'Some correction',
        userId: 'test-user-id',
        timestamp: new Date(),
      };

      mockKnowledgeRepository.getVerificationResult.mockRejectedValue(
        new Error('Database error')
      );

      // Act & Assert
      await expect(
        knowledgeBaseUpdater.updateFromFeedback(feedbackData)
      ).rejects.toThrow('Database error');
    });
  });
});
