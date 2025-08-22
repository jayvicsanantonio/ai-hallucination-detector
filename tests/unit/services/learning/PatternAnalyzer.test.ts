import {
  PatternAnalyzer,
  PatternInsight,
  TrendAnalysis,
} from '../../../../src/services/learning/PatternAnalyzer';
import { FeedbackData } from '../../../../src/models/audit/FeedbackData';
import { FeedbackRepository } from '../../../../src/database/interfaces/FeedbackRepository';

// Mock dependencies
jest.mock('../../../../src/database/interfaces/FeedbackRepository');
jest.mock('../../../../src/utils/Logger');

describe('PatternAnalyzer', () => {
  let patternAnalyzer: PatternAnalyzer;
  let mockFeedbackRepository: jest.Mocked<FeedbackRepository>;

  beforeEach(() => {
    mockFeedbackRepository =
      new FeedbackRepository() as jest.Mocked<FeedbackRepository>;
    patternAnalyzer = new PatternAnalyzer(mockFeedbackRepository);
  });

  describe('analyzeNewFeedback', () => {
    it('should identify correction patterns', async () => {
      // Arrange
      const feedbackData: FeedbackData = {
        verificationId: 'test-id',
        userFeedback: 'incorrect',
        corrections: 'The percentage should be 25% not 20%',
        expertNotes: 'This is context dependent',
        userId: 'user-1',
        timestamp: new Date(),
      };

      mockFeedbackRepository.getRecentFeedback.mockResolvedValue([]);

      // Act
      const patterns = await patternAnalyzer.analyzeNewFeedback(
        feedbackData
      );

      // Assert
      expect(patterns).toContain(
        'correction_pattern_\\b(\\d+\\.?\\d*)\\s*%'
      );
      expect(patterns).toContain('replacement_correction');
      expect(patterns).toContain('context_dependent');
    });

    it('should identify negation patterns', async () => {
      // Arrange
      const feedbackData: FeedbackData = {
        verificationId: 'test-id',
        userFeedback: 'incorrect',
        corrections: 'This is not correct',
        userId: 'user-1',
        timestamp: new Date(),
      };

      mockFeedbackRepository.getRecentFeedback.mockResolvedValue([]);

      // Act
      const patterns = await patternAnalyzer.analyzeNewFeedback(
        feedbackData
      );

      // Assert
      expect(patterns).toContain('negation_correction');
    });

    it('should identify temporal patterns', async () => {
      // Arrange
      const feedbackData: FeedbackData = {
        verificationId: 'test-id',
        userFeedback: 'incorrect',
        userId: 'user-1',
        timestamp: new Date(),
      };

      const recentFeedback: FeedbackData[] = [
        {
          verificationId: 'test-id',
          userFeedback: 'incorrect',
          userId: 'user-1',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        },
        {
          verificationId: 'test-id',
          userFeedback: 'incorrect',
          userId: 'user-2',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
      ];

      mockFeedbackRepository.getRecentFeedback.mockResolvedValue(
        recentFeedback
      );

      // Act
      const patterns = await patternAnalyzer.analyzeNewFeedback(
        feedbackData
      );

      // Assert
      expect(patterns).toContain('recurring_accuracy_issue');
    });

    it('should handle empty corrections gracefully', async () => {
      // Arrange
      const feedbackData: FeedbackData = {
        verificationId: 'test-id',
        userFeedback: 'correct',
        userId: 'user-1',
        timestamp: new Date(),
      };

      mockFeedbackRepository.getRecentFeedback.mockResolvedValue([]);

      // Act
      const patterns = await patternAnalyzer.analyzeNewFeedback(
        feedbackData
      );

      // Assert
      expect(patterns).toEqual([]);
    });
  });

  describe('analyzeFeedbackPatterns', () => {
    const mockFeedbackData: FeedbackData[] = [
      {
        verificationId: 'test-1',
        userFeedback: 'correct',
        userId: 'user-1',
        timestamp: new Date('2024-01-15'),
      },
      {
        verificationId: 'test-2',
        userFeedback: 'incorrect',
        corrections: 'Should be 30%',
        userId: 'user-2',
        timestamp: new Date('2024-01-16'),
      },
      {
        verificationId: 'test-3',
        userFeedback: 'partial',
        corrections: 'Partially correct',
        expertNotes: 'Context matters',
        userId: 'user-3',
        timestamp: new Date('2024-01-17'),
      },
    ];

    it('should analyze feedback patterns successfully', async () => {
      // Arrange
      const options = { domain: 'legal', timeframe: '30d' };
      mockFeedbackRepository.getFeedbackForAnalysis.mockResolvedValue(
        mockFeedbackData
      );

      // Act
      const result = await patternAnalyzer.analyzeFeedbackPatterns(
        options
      );

      // Assert
      expect(result.domain).toBe('legal');
      expect(result.timeframe).toBe('30d');
      expect(result.trends).toBeDefined();
      expect(result.commonCorrections).toBeDefined();
      expect(result.improvementAreas).toBeDefined();
    });

    it('should identify common corrections', async () => {
      // Arrange
      const feedbackWithCorrections = [
        ...mockFeedbackData,
        {
          verificationId: 'test-4',
          userFeedback: 'incorrect' as const,
          corrections: 'Should be 30%',
          userId: 'user-4',
          timestamp: new Date('2024-01-18'),
        },
      ];

      mockFeedbackRepository.getFeedbackForAnalysis.mockResolvedValue(
        feedbackWithCorrections
      );

      // Act
      const result = await patternAnalyzer.analyzeFeedbackPatterns({
        timeframe: '30d',
      });

      // Assert
      expect(result.commonCorrections).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            correctedText: 'Should be 30%',
            frequency: 2,
          }),
        ])
      );
    });

    it('should identify improvement areas', async () => {
      // Arrange
      const feedbackWithHighErrorRate = Array(10)
        .fill(null)
        .map((_, i) => ({
          verificationId: `test-${i}`,
          userFeedback: 'incorrect' as const,
          corrections: 'Various corrections',
          userId: `user-${i}`,
          timestamp: new Date(`2024-01-${i + 1}`),
        }));

      mockFeedbackRepository.getFeedbackForAnalysis.mockResolvedValue(
        feedbackWithHighErrorRate
      );

      // Act
      const result = await patternAnalyzer.analyzeFeedbackPatterns({
        timeframe: '30d',
      });

      // Assert
      expect(result.improvementAreas).toContain(
        'High false positive rate - review detection algorithms'
      );
    });

    it('should handle context-related feedback', async () => {
      // Arrange
      const contextFeedback = Array(5)
        .fill(null)
        .map((_, i) => ({
          verificationId: `test-${i}`,
          userFeedback: 'partial' as const,
          expertNotes: 'This depends on context',
          userId: `user-${i}`,
          timestamp: new Date(`2024-01-${i + 1}`),
        }));

      mockFeedbackRepository.getFeedbackForAnalysis.mockResolvedValue(
        contextFeedback
      );

      // Act
      const result = await patternAnalyzer.analyzeFeedbackPatterns({
        timeframe: '30d',
      });

      // Assert
      expect(result.improvementAreas).toContain(
        'Context sensitivity needs improvement'
      );
    });

    it('should calculate trends correctly', async () => {
      // Arrange
      const trendFeedback = [
        {
          verificationId: 'test-1',
          userFeedback: 'correct' as const,
          userId: 'user-1',
          timestamp: new Date('2024-01-01'),
        },
        {
          verificationId: 'test-2',
          userFeedback: 'incorrect' as const,
          userId: 'user-2',
          timestamp: new Date('2024-01-02'),
        },
      ];

      mockFeedbackRepository.getFeedbackForAnalysis.mockResolvedValue(
        trendFeedback
      );

      // Act
      const result = await patternAnalyzer.analyzeFeedbackPatterns({
        timeframe: '30d',
      });

      // Assert
      expect(result.trends).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            accuracy: expect.any(Number),
            volume: expect.any(Number),
          }),
        ])
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockFeedbackRepository.getFeedbackForAnalysis.mockRejectedValue(
        new Error('Database error')
      );

      // Act & Assert
      await expect(
        patternAnalyzer.analyzeFeedbackPatterns({ timeframe: '30d' })
      ).rejects.toThrow('Database error');
    });
  });
});
