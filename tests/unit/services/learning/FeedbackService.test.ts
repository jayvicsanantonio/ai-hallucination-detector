import {
  FeedbackService,
  FeedbackStats,
  ProcessedFeedback,
} from '../../../../src/services/learning/FeedbackService';
import { FeedbackData } from '../../../../src/models/audit/FeedbackData';
import { FeedbackRepository } from '../../../../src/database/interfaces/FeedbackRepository';
import { KnowledgeBaseUpdater } from '../../../../src/services/learning/KnowledgeBaseUpdater';
import { PatternAnalyzer } from '../../../../src/services/learning/PatternAnalyzer';

// Mock dependencies
jest.mock('../../../../src/database/interfaces/FeedbackRepository');
jest.mock('../../../../src/services/learning/KnowledgeBaseUpdater');
jest.mock('../../../../src/services/learning/PatternAnalyzer');
jest.mock('../../../../src/utils/Logger');

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;
  let mockFeedbackRepository: jest.Mocked<FeedbackRepository>;
  let mockKnowledgeBaseUpdater: jest.Mocked<KnowledgeBaseUpdater>;
  let mockPatternAnalyzer: jest.Mocked<PatternAnalyzer>;

  beforeEach(() => {
    mockFeedbackRepository =
      new FeedbackRepository() as jest.Mocked<FeedbackRepository>;
    mockKnowledgeBaseUpdater =
      new KnowledgeBaseUpdater() as jest.Mocked<KnowledgeBaseUpdater>;
    mockPatternAnalyzer =
      new PatternAnalyzer() as jest.Mocked<PatternAnalyzer>;

    feedbackService = new FeedbackService(
      mockFeedbackRepository,
      mockKnowledgeBaseUpdater,
      mockPatternAnalyzer
    );
  });

  describe('processFeedback', () => {
    const mockFeedbackData: FeedbackData = {
      verificationId: 'test-verification-id',
      userFeedback: 'incorrect',
      corrections: 'The correct value should be 25%',
      expertNotes: 'This is a context-dependent correction',
      userId: 'test-user-id',
      timestamp: new Date(),
      confidence: 0.9,
    };

    it('should process feedback successfully', async () => {
      // Arrange
      const storedFeedback = {
        ...mockFeedbackData,
        id: 'feedback-id',
      };
      mockFeedbackRepository.create.mockResolvedValue(storedFeedback);
      mockPatternAnalyzer.analyzeNewFeedback.mockResolvedValue([
        'correction_pattern',
        'context_dependent',
      ]);
      mockKnowledgeBaseUpdater.updateFromFeedback.mockResolvedValue(
        []
      );

      // Act
      const result = await feedbackService.processFeedback(
        mockFeedbackData
      );

      // Assert
      expect(result).toEqual({
        id: 'feedback-id',
        processed: true,
        knowledgeBaseUpdated: true,
        patternsIdentified: [
          'correction_pattern',
          'context_dependent',
        ],
      });

      expect(mockFeedbackRepository.create).toHaveBeenCalledWith(
        mockFeedbackData
      );
      expect(
        mockPatternAnalyzer.analyzeNewFeedback
      ).toHaveBeenCalledWith(mockFeedbackData);
      expect(
        mockKnowledgeBaseUpdater.updateFromFeedback
      ).toHaveBeenCalledWith(mockFeedbackData);
    });

    it('should handle feedback without corrections', async () => {
      // Arrange
      const feedbackWithoutCorrections = {
        ...mockFeedbackData,
        userFeedback: 'correct' as const,
        corrections: undefined,
      };
      const storedFeedback = {
        ...feedbackWithoutCorrections,
        id: 'feedback-id',
      };

      mockFeedbackRepository.create.mockResolvedValue(storedFeedback);
      mockPatternAnalyzer.analyzeNewFeedback.mockResolvedValue([]);

      // Act
      const result = await feedbackService.processFeedback(
        feedbackWithoutCorrections
      );

      // Assert
      expect(result.knowledgeBaseUpdated).toBe(false);
      expect(
        mockKnowledgeBaseUpdater.updateFromFeedback
      ).not.toHaveBeenCalled();
    });

    it('should handle processing errors gracefully', async () => {
      // Arrange
      mockFeedbackRepository.create.mockRejectedValue(
        new Error('Database error')
      );

      // Act & Assert
      await expect(
        feedbackService.processFeedback(mockFeedbackData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getFeedbackStats', () => {
    it('should return correct feedback statistics', async () => {
      // Arrange
      const mockFeedback: FeedbackData[] = [
        {
          verificationId: 'test-id',
          userFeedback: 'correct',
          userId: 'user1',
          timestamp: new Date(),
          confidence: 0.9,
        },
        {
          verificationId: 'test-id',
          userFeedback: 'incorrect',
          userId: 'user2',
          timestamp: new Date(),
          confidence: 0.8,
        },
        {
          verificationId: 'test-id',
          userFeedback: 'partial',
          userId: 'user3',
          timestamp: new Date(),
          confidence: 0.7,
        },
      ];

      mockFeedbackRepository.findByVerificationId.mockResolvedValue(
        mockFeedback
      );
      mockFeedbackRepository.getCommonIssues.mockResolvedValue([
        { issueType: 'factual_error', count: 2, accuracy: 0.8 },
      ]);

      // Act
      const stats = await feedbackService.getFeedbackStats('test-id');

      // Assert
      expect(stats).toEqual({
        totalFeedback: 3,
        correctCount: 1,
        incorrectCount: 1,
        partialCount: 1,
        averageConfidence: expect.closeTo(0.8, 1),
        commonIssues: [
          { issueType: 'factual_error', count: 2, accuracy: 0.8 },
        ],
      });
    });

    it('should handle empty feedback gracefully', async () => {
      // Arrange
      mockFeedbackRepository.findByVerificationId.mockResolvedValue(
        []
      );
      mockFeedbackRepository.getCommonIssues.mockResolvedValue([]);

      // Act
      const stats = await feedbackService.getFeedbackStats('test-id');

      // Assert
      expect(stats.totalFeedback).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });
  });

  describe('analyzeFeedbackPatterns', () => {
    it('should delegate to pattern analyzer', async () => {
      // Arrange
      const options = { domain: 'legal', timeframe: '30d' };
      const mockPatterns = {
        domain: 'legal' as const,
        timeframe: '30d',
        trends: [],
        commonCorrections: [],
        improvementAreas: [],
      };

      mockPatternAnalyzer.analyzeFeedbackPatterns.mockResolvedValue(
        mockPatterns
      );

      // Act
      const result = await feedbackService.analyzeFeedbackPatterns(
        options
      );

      // Assert
      expect(result).toEqual(mockPatterns);
      expect(
        mockPatternAnalyzer.analyzeFeedbackPatterns
      ).toHaveBeenCalledWith(options);
    });

    it('should handle analysis errors', async () => {
      // Arrange
      const options = { domain: 'legal' };
      mockPatternAnalyzer.analyzeFeedbackPatterns.mockRejectedValue(
        new Error('Analysis error')
      );

      // Act & Assert
      await expect(
        feedbackService.analyzeFeedbackPatterns(options)
      ).rejects.toThrow('Analysis error');
    });
  });
});
