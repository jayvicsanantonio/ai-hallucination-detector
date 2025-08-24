import { FeedbackData } from '../../models/audit/FeedbackData';
import { FactualClaim } from '../../models/knowledge/FactualClaim';
import { ComplianceRule } from '../../models/knowledge/ComplianceRule';
import { KnowledgeBaseRepository } from '../../database/interfaces/KnowledgeBaseRepository';
import { Logger } from '../../utils/Logger';

export interface KnowledgeUpdate {
  type: 'factual_claim' | 'compliance_rule' | 'pattern_rule';
  action: 'create' | 'update' | 'deprecate';
  confidence: number;
  source: 'user_feedback';
}

export class KnowledgeBaseUpdater {
  private knowledgeRepository: KnowledgeBaseRepository;
  private logger: Logger;

  constructor(knowledgeRepository?: KnowledgeBaseRepository) {
    this.knowledgeRepository =
      knowledgeRepository || new KnowledgeBaseRepository();
    this.logger = new Logger('KnowledgeBaseUpdater');
  }

  /**
   * Update knowledge base based on user feedback
   */
  async updateFromFeedback(
    feedbackData: FeedbackData
  ): Promise<KnowledgeUpdate[]> {
    try {
      this.logger.info('Updating knowledge base from feedback', {
        verificationId: feedbackData.verificationId,
        feedbackType: feedbackData.userFeedback,
      });

      const updates: KnowledgeUpdate[] = [];

      // Get the original verification result to understand what was flagged
      const verificationResult =
        await this.knowledgeRepository.getVerificationResult(
          feedbackData.verificationId
        );

      if (!verificationResult) {
        this.logger.warn('No verification result found for feedback');
        return updates;
      }

      // Process corrections based on feedback type
      if (feedbackData.userFeedback === 'incorrect') {
        updates.push(
          ...(await this.processIncorrectFeedback(
            feedbackData,
            verificationResult
          ))
        );
      } else if (feedbackData.userFeedback === 'correct') {
        updates.push(
          ...(await this.processCorrectFeedback(
            feedbackData,
            verificationResult
          ))
        );
      } else if (feedbackData.userFeedback === 'partially_correct') {
        updates.push(
          ...(await this.processPartialFeedback(
            feedbackData,
            verificationResult
          ))
        );
      }

      this.logger.info('Knowledge base updated', {
        updatesCount: updates.length,
        verificationId: feedbackData.verificationId,
      });

      return updates;
    } catch (error) {
      this.logger.error(
        'Error updating knowledge base from feedback',
        {
          error:
            error instanceof Error ? error.message : String(error),
          verificationId: feedbackData.verificationId,
        }
      );
      throw error;
    }
  }

  /**
   * Process feedback indicating the verification was incorrect
   */
  private async processIncorrectFeedback(
    feedbackData: FeedbackData,
    verificationResult: any
  ): Promise<KnowledgeUpdate[]> {
    const updates: KnowledgeUpdate[] = [];

    try {
      // If system flagged something as incorrect but user says it's correct
      if (
        verificationResult.issues &&
        verificationResult.issues.length > 0
      ) {
        for (const issue of verificationResult.issues) {
          if (
            feedbackData.issueId &&
            issue.id !== feedbackData.issueId
          ) {
            continue; // Skip if feedback is for a specific issue
          }

          // Create or update factual claim based on correction
          if (
            issue.type === 'factual_error' &&
            feedbackData.corrections
          ) {
            const factualClaim: Partial<FactualClaim> = {
              statement: feedbackData.corrections,
              confidence: feedbackData.confidence || 0.8,
              domain: verificationResult.domain,
              lastVerified: new Date(),
              sources: [
                {
                  id: `user_feedback_${feedbackData.userId}`,
                  name: 'User Correction',
                  title: 'User Correction',
                  type: 'internal',
                  sourceType: 'internal',
                  credibilityScore: 0.7,
                  lastUpdated: new Date(),
                },
              ],
            };

            await this.knowledgeRepository.createOrUpdateFactualClaim(
              factualClaim
            );
            updates.push({
              type: 'factual_claim',
              action: 'create',
              confidence: factualClaim.confidence!,
              source: 'user_feedback',
            });
          }

          // Update compliance rules if needed
          if (
            issue.type === 'compliance_violation' &&
            feedbackData.expertNotes
          ) {
            await this.updateComplianceRule(issue, feedbackData);
            updates.push({
              type: 'compliance_rule',
              action: 'update',
              confidence: 0.8,
              source: 'user_feedback',
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error processing incorrect feedback', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return updates;
  }

  /**
   * Process feedback indicating the verification was correct
   */
  private async processCorrectFeedback(
    feedbackData: FeedbackData,
    verificationResult: any
  ): Promise<KnowledgeUpdate[]> {
    const updates: KnowledgeUpdate[] = [];

    try {
      // Reinforce existing knowledge that was correctly identified
      if (
        verificationResult.issues &&
        verificationResult.issues.length > 0
      ) {
        for (const issue of verificationResult.issues) {
          // Increase confidence in rules that correctly identified issues
          await this.reinforceKnowledge(issue, feedbackData);
          updates.push({
            type:
              issue.type === 'factual_error'
                ? 'factual_claim'
                : 'compliance_rule',
            action: 'update',
            confidence: 0.9,
            source: 'user_feedback',
          });
        }
      }
    } catch (error) {
      this.logger.error('Error processing correct feedback', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return updates;
  }

  /**
   * Process partial feedback
   */
  private async processPartialFeedback(
    feedbackData: FeedbackData,
    verificationResult: any
  ): Promise<KnowledgeUpdate[]> {
    const updates: KnowledgeUpdate[] = [];

    try {
      // Handle partial corrections
      if (feedbackData.corrections && feedbackData.expertNotes) {
        // Create nuanced rules based on expert notes
        await this.createNuancedRule(
          feedbackData,
          verificationResult
        );
        updates.push({
          type: 'pattern_rule',
          action: 'create',
          confidence: 0.6,
          source: 'user_feedback',
        });
      }
    } catch (error) {
      this.logger.error('Error processing partial feedback', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return updates;
  }

  /**
   * Update compliance rule based on feedback
   */
  private async updateComplianceRule(
    issue: any,
    feedbackData: FeedbackData
  ): Promise<void> {
    try {
      // Find the compliance rule that triggered this issue
      const rule =
        await this.knowledgeRepository.findComplianceRuleByIssue(
          issue
        );

      if (rule) {
        // Adjust rule confidence or add exception based on expert notes
        const updatedRule: Partial<ComplianceRule> = {
          ...rule,
          lastUpdated: new Date(),
          examples: [
            ...(rule.examples || []),
            feedbackData.expertNotes!,
          ],
        };

        await this.knowledgeRepository.updateComplianceRule(
          rule.id,
          updatedRule
        );
      }
    } catch (error) {
      this.logger.error('Error updating compliance rule', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Reinforce existing knowledge that was correctly identified
   */
  private async reinforceKnowledge(
    issue: any,
    feedbackData: FeedbackData
  ): Promise<void> {
    try {
      if (issue.type === 'factual_error') {
        // Increase confidence in factual claims that were correctly identified
        await this.knowledgeRepository.reinforceFactualClaim(
          issue.evidence
        );
      } else if (issue.type === 'compliance_violation') {
        // Increase confidence in compliance rules
        await this.knowledgeRepository.reinforceComplianceRule(
          issue.ruleId
        );
      }
    } catch (error) {
      this.logger.error('Error reinforcing knowledge', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create nuanced rule for partial feedback
   */
  private async createNuancedRule(
    feedbackData: FeedbackData,
    verificationResult: unknown
  ): Promise<void> {
    try {
      // Create a pattern-based rule that captures the nuance
      const patternRule = {
        pattern: this.extractPattern(feedbackData.corrections!),
        context: feedbackData.expertNotes!,
        confidence: 0.6,
        domain: (verificationResult as unknown).domain,
        createdFrom: 'partial_feedback',
        userId: feedbackData.userId,
      };

      await this.knowledgeRepository.createPatternRule(patternRule);
    } catch (error) {
      this.logger.error('Error creating nuanced rule', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extract pattern from correction text
   */
  private extractPattern(correction: string): string {
    // Simple pattern extraction - in production this would be more sophisticated
    return correction
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
  }
}
