import { FeedbackData } from '../../models/audit/FeedbackData';
import { KnowledgeBaseRepository } from '../../database/interfaces/KnowledgeBaseRepository';
export interface KnowledgeUpdate {
    type: 'factual_claim' | 'compliance_rule' | 'pattern_rule';
    action: 'create' | 'update' | 'deprecate';
    confidence: number;
    source: 'user_feedback';
}
export declare class KnowledgeBaseUpdater {
    private knowledgeRepository;
    private logger;
    constructor(knowledgeRepository?: KnowledgeBaseRepository);
    /**
     * Update knowledge base based on user feedback
     */
    updateFromFeedback(feedbackData: FeedbackData): Promise<KnowledgeUpdate[]>;
    /**
     * Process feedback indicating the verification was incorrect
     */
    private processIncorrectFeedback;
    /**
     * Process feedback indicating the verification was correct
     */
    private processCorrectFeedback;
    /**
     * Process partial feedback
     */
    private processPartialFeedback;
    /**
     * Update compliance rule based on feedback
     */
    private updateComplianceRule;
    /**
     * Reinforce existing knowledge that was correctly identified
     */
    private reinforceKnowledge;
    /**
     * Create nuanced rule for partial feedback
     */
    private createNuancedRule;
    /**
     * Extract pattern from correction text
     */
    private extractPattern;
}
//# sourceMappingURL=KnowledgeBaseUpdater.d.ts.map