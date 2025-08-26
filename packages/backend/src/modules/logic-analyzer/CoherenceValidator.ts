import {
  ParsedContent,
  ExtractedEntity,
} from '@/models/core/ParsedContent';
import { TextLocation } from '@/models/core/TextLocation';
import { IssueSeverity } from '@/models/core/ContentTypes';

export interface CoherenceIssue {
  id: string;
  type:
    | 'semantic_incoherence'
    | 'temporal_inconsistency'
    | 'causal_inconsistency'
    | 'reference_error';
  description: string;
  location: TextLocation;
  severity: IssueSeverity;
  confidence: number;
  evidence: string[];
  context: string;
}

export interface TemporalEvent {
  id: string;
  description: string;
  timestamp?: Date;
  timeExpression: string;
  location: TextLocation;
  relativeOrder?: number;
}

export interface CausalRelation {
  id: string;
  cause: string;
  effect: string;
  causeLocation: TextLocation;
  effectLocation: TextLocation;
  confidence: number;
  type: 'direct' | 'indirect' | 'conditional';
}

export interface CrossReference {
  id: string;
  referenceText: string;
  targetText?: string;
  location: TextLocation;
  targetLocation?: TextLocation;
  isResolved: boolean;
  type: 'pronoun' | 'definite_reference' | 'anaphora' | 'cataphora';
}

export class CoherenceValidator {
  private temporalIndicators = [
    'before',
    'after',
    'during',
    'while',
    'when',
    'then',
    'first',
    'last',
    'earlier',
    'later',
    'previously',
    'subsequently',
    'meanwhile',
    'simultaneously',
    'next',
    'following',
    'preceding',
    'prior',
    'until',
    'since',
    'ago',
    'yesterday',
    'today',
    'tomorrow',
    'now',
    'currently',
    'recently',
  ];

  private causalIndicators = [
    'because',
    'since',
    'due to',
    'caused by',
    'results in',
    'leads to',
    'therefore',
    'thus',
    'consequently',
    'as a result',
    'so that',
    'hence',
    'owing to',
    'thanks to',
    'resulting from',
    'brings about',
    'triggers',
  ];

  private referencePronouns = [
    'he',
    'she',
    'it',
    'they',
    'him',
    'her',
    'them',
    'his',
    'hers',
    'its',
    'their',

    'that',
    'these',
    'those',
    'such',
    'said',
    'aforementioned',
  ];

  async validateCoherence(
    content: ParsedContent
  ): Promise<CoherenceIssue[]> {
    const issues: CoherenceIssue[] = [];

    try {
      const text = content.extractedText;

      if (!text) {
        return issues;
      }

      // Validate semantic coherence
      const semanticIssues = await this.validateSemanticCoherence(
        content
      );
      issues.push(...semanticIssues);

      // Validate temporal consistency
      const temporalIssues = await this.validateTemporalConsistency(
        content
      );
      issues.push(...temporalIssues);

      // Validate causal consistency
      const causalIssues = await this.validateCausalConsistency(
        content
      );
      issues.push(...causalIssues);

      // Validate cross-references
      const referenceIssues = await this.validateCrossReferences(
        content
      );
      issues.push(...referenceIssues);

      return issues;
    } catch (error) {
      console.error('Error validating coherence:', error);
      return [];
    }
  }

  private async validateSemanticCoherence(
    content: ParsedContent
  ): Promise<CoherenceIssue[]> {
    const issues: CoherenceIssue[] = [];
    const text = content.extractedText;
    const sentences = this.extractSentences(text);

    // Check for topic drift and semantic consistency
    for (let i = 0; i < sentences.length - 1; i++) {
      const currentSentence = sentences[i];
      const nextSentence = sentences[i + 1];

      const semanticSimilarity = this.calculateSemanticSimilarity(
        currentSentence.text,
        nextSentence.text
      );

      // If semantic similarity is very low, it might indicate incoherence
      if (
        semanticSimilarity < 0.05 &&
        this.isSignificantTopicShift(currentSentence, nextSentence)
      ) {
        issues.push({
          id: `semantic_${Date.now()}_${Math.random()}`,
          type: 'semantic_incoherence',
          description: 'Abrupt topic shift without proper transition',
          location: nextSentence.location,
          severity: 'medium',
          confidence: (1 - semanticSimilarity) * 80,
          evidence: [currentSentence.text, nextSentence.text],
          context: this.getContext(
            text,
            nextSentence.location.start,
            100
          ),
        });
      }
    }

    // Check for contradictory semantic content
    const contradictoryPairs =
      this.findSemanticContradictions(sentences);
    contradictoryPairs.forEach((pair) => {
      issues.push({
        id: `semantic_contradiction_${Date.now()}_${Math.random()}`,
        type: 'semantic_incoherence',
        description: 'Semantically contradictory statements detected',
        location: pair.sentence2.location,
        severity: 'high',
        confidence: pair.confidence,
        evidence: [pair.sentence1.text, pair.sentence2.text],
        context: this.getContext(
          text,
          pair.sentence2.location.start,
          100
        ),
      });
    });

    return issues;
  }

  private async validateTemporalConsistency(
    content: ParsedContent
  ): Promise<CoherenceIssue[]> {
    const issues: CoherenceIssue[] = [];
    const text = content.extractedText;

    // Extract temporal events
    const temporalEvents = this.extractTemporalEvents(text);

    // Check for temporal inconsistencies
    for (let i = 0; i < temporalEvents.length; i++) {
      for (let j = i + 1; j < temporalEvents.length; j++) {
        const event1 = temporalEvents[i];
        const event2 = temporalEvents[j];

        const inconsistency = this.checkTemporalInconsistency(
          event1,
          event2
        );
        if (inconsistency) {
          issues.push({
            id: `temporal_${Date.now()}_${Math.random()}`,
            type: 'temporal_inconsistency',
            description: inconsistency.description,
            location: event2.location,
            severity: inconsistency.severity,
            confidence: inconsistency.confidence,
            evidence: [event1.description, event2.description],
            context: this.getContext(
              text,
              event2.location.start,
              100
            ),
          });
        }
      }
    }

    return issues;
  }

  private async validateCausalConsistency(
    content: ParsedContent
  ): Promise<CoherenceIssue[]> {
    const issues: CoherenceIssue[] = [];
    const text = content.extractedText;

    // Extract causal relations
    const causalRelations = this.extractCausalRelations(text);

    // Check for causal inconsistencies
    for (let i = 0; i < causalRelations.length; i++) {
      for (let j = i + 1; j < causalRelations.length; j++) {
        const relation1 = causalRelations[i];
        const relation2 = causalRelations[j];

        const inconsistency = this.checkCausalInconsistency(
          relation1,
          relation2
        );
        if (inconsistency) {
          issues.push({
            id: `causal_${Date.now()}_${Math.random()}`,
            type: 'causal_inconsistency',
            description: inconsistency.description,
            location: relation2.effectLocation,
            severity: inconsistency.severity,
            confidence: inconsistency.confidence,
            evidence: [
              `${relation1.cause} → ${relation1.effect}`,
              `${relation2.cause} → ${relation2.effect}`,
            ],
            context: this.getContext(
              text,
              relation2.effectLocation.start,
              100
            ),
          });
        }
      }
    }

    return issues;
  }

  private async validateCrossReferences(
    content: ParsedContent
  ): Promise<CoherenceIssue[]> {
    const issues: CoherenceIssue[] = [];
    const text = content.extractedText;

    // Extract cross-references
    const crossReferences = this.extractCrossReferences(
      text,
      content.entities
    );

    // Check for unresolved references
    crossReferences.forEach((reference) => {
      if (!reference.isResolved) {
        issues.push({
          id: `reference_${Date.now()}_${Math.random()}`,
          type: 'reference_error',
          description: `Unresolved reference: "${reference.referenceText}"`,
          location: reference.location,
          severity: 'medium',
          confidence: 75,
          evidence: [reference.referenceText],
          context: this.getContext(
            text,
            reference.location.start,
            100
          ),
        });
      }
    });

    return issues;
  }

  private extractSentences(
    text: string
  ): Array<{ text: string; location: TextLocation }> {
    const sentences: Array<{ text: string; location: TextLocation }> =
      [];
    const sentenceRegex = /[.!?]+/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = sentenceRegex.exec(text)) !== null) {
      const sentenceText = text
        .substring(lastIndex, match.index + match[0].length)
        .trim();
      if (sentenceText.length > 10) {
        sentences.push({
          text: sentenceText,
          location: {
            start: lastIndex,
            end: match.index + match[0].length,
            line: this.getLineNumber(text, lastIndex),
            column: this.getColumnNumber(text, lastIndex),
          },
        });
      }
      lastIndex = match.index + match[0].length;
    }

    // Handle the last sentence if it doesn't end with punctuation
    if (lastIndex < text.length) {
      const lastSentence = text.substring(lastIndex).trim();
      if (lastSentence.length > 10) {
        sentences.push({
          text: lastSentence,
          location: {
            start: lastIndex,
            end: text.length,
            line: this.getLineNumber(text, lastIndex),
            column: this.getColumnNumber(text, lastIndex),
          },
        });
      }
    }

    return sentences;
  }

  private calculateSemanticSimilarity(
    text1: string,
    text2: string
  ): number {
    // Simple word overlap-based similarity
    const words1 = new Set(
      text1
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
    const words2 = new Set(
      text2
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

    const intersection = new Set(
      [...words1].filter((x) => words2.has(x))
    );
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private isSignificantTopicShift(
    sentence1: any,
    sentence2: any
  ): boolean {
    // Check if there are transition words that might indicate intentional topic shift
    const transitionWords = [
      'however',
      'meanwhile',
      'furthermore',
      'moreover',
      'additionally',
      'on the other hand',
      'in contrast',
      'similarly',
      'likewise',
      'nevertheless',
    ];

    const text2Lower = sentence2.text.toLowerCase();
    return !transitionWords.some((word) => text2Lower.includes(word));
  }

  private findSemanticContradictions(
    sentences: Array<{ text: string; location: TextLocation }>
  ): Array<{
    sentence1: any;
    sentence2: any;
    confidence: number;
  }> {
    const contradictions: Array<{
      sentence1: any;
      sentence2: any;
      confidence: number;
    }> = [];

    // Look for sentences with opposite sentiment about the same topic
    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        const sent1 = sentences[i];
        const sent2 = sentences[j];

        const topicSimilarity = this.calculateSemanticSimilarity(
          sent1.text,
          sent2.text
        );
        if (topicSimilarity > 0.3) {
          // Same topic
          const sentiment1 = this.analyzeSentiment(sent1.text);
          const sentiment2 = this.analyzeSentiment(sent2.text);

          if (
            sentiment1 !== 'neutral' &&
            sentiment2 !== 'neutral' &&
            sentiment1 !== sentiment2
          ) {
            contradictions.push({
              sentence1: sent1,
              sentence2: sent2,
              confidence: topicSimilarity * 80,
            });
          }
        }
      }
    }

    return contradictions;
  }

  private extractTemporalEvents(text: string): TemporalEvent[] {
    const events: TemporalEvent[] = [];
    const sentences = this.extractSentences(text);

    sentences.forEach((sentence) => {
      this.temporalIndicators.forEach((indicator) => {
        if (sentence.text.toLowerCase().includes(indicator)) {
          events.push({
            id: `event_${Date.now()}_${Math.random()}`,
            description: sentence.text,
            timeExpression: indicator,
            location: sentence.location,
            relativeOrder: this.getTemporalOrder(indicator),
          });
        }
      });
    });

    return events;
  }

  private extractCausalRelations(text: string): CausalRelation[] {
    const relations: CausalRelation[] = [];
    const sentences = this.extractSentences(text);

    sentences.forEach((sentence) => {
      this.causalIndicators.forEach((indicator) => {
        if (sentence.text.toLowerCase().includes(indicator)) {
          const parts = sentence.text.split(
            new RegExp(indicator, 'i')
          );
          if (parts.length === 2) {
            relations.push({
              id: `causal_${Date.now()}_${Math.random()}`,
              cause: parts[0].trim(),
              effect: parts[1].trim(),
              causeLocation: sentence.location,
              effectLocation: sentence.location,
              confidence: 70,
              type: 'direct',
            });
          }
        }
      });
    });

    return relations;
  }

  private extractCrossReferences(
    text: string,
    entities: ExtractedEntity[]
  ): CrossReference[] {
    const references: CrossReference[] = [];
    const sentences = this.extractSentences(text);

    sentences.forEach((sentence) => {
      this.referencePronouns.forEach((pronoun) => {
        const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
        let match;
        while ((match = regex.exec(sentence.text)) !== null) {
          const reference: CrossReference = {
            id: `ref_${Date.now()}_${Math.random()}`,
            referenceText: match[0],
            location: {
              start: sentence.location.start + match.index,
              end:
                sentence.location.start +
                match.index +
                match[0].length,
              line: sentence.location.line,
              column: (sentence.location.column || 1) + match.index,
            },
            isResolved: false,
            type: this.classifyReferenceType(match[0]),
          };

          // Try to resolve the reference
          reference.isResolved = this.tryResolveReference(
            reference,
            entities,
            sentences
          );
          references.push(reference);
        }
      });
    });

    return references;
  }

  private checkTemporalInconsistency(
    event1: TemporalEvent,
    event2: TemporalEvent
  ): {
    description: string;
    severity: IssueSeverity;
    confidence: number;
  } | null {
    // Simple temporal consistency check
    if (event1.relativeOrder && event2.relativeOrder) {
      if (
        event1.relativeOrder > event2.relativeOrder &&
        event1.location.start < event2.location.start
      ) {
        return {
          description: 'Temporal order inconsistency detected',
          severity: 'medium',
          confidence: 70,
        };
      }
    }
    return null;
  }

  private checkCausalInconsistency(
    relation1: CausalRelation,
    relation2: CausalRelation
  ): {
    description: string;
    severity: IssueSeverity;
    confidence: number;
  } | null {
    // Check for circular causality
    if (
      relation1.cause
        .toLowerCase()
        .includes(relation2.effect.toLowerCase()) &&
      relation2.cause
        .toLowerCase()
        .includes(relation1.effect.toLowerCase())
    ) {
      return {
        description: 'Circular causality detected',
        severity: 'high',
        confidence: 80,
      };
    }
    return null;
  }

  private analyzeSentiment(
    text: string
  ): 'positive' | 'negative' | 'neutral' {
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'positive',
      'success',
      'effective',
      'beneficial',
      'advantageous',
      'helpful',
      'useful',
      'valuable',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'negative',
      'failure',
      'ineffective',
      'harmful',
      'disadvantageous',
      'useless',
      'worthless',
      'problematic',
    ];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter((word) =>
      lowerText.includes(word)
    ).length;
    const negativeCount = negativeWords.filter((word) =>
      lowerText.includes(word)
    ).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private getTemporalOrder(indicator: string): number {
    const orderMap: Record<string, number> = {
      before: 1,
      earlier: 1,
      previously: 1,
      prior: 1,
      during: 2,
      while: 2,
      meanwhile: 2,
      simultaneously: 2,
      after: 3,
      later: 3,
      subsequently: 3,
      following: 3,
      then: 4,
      next: 4,
    };
    return orderMap[indicator.toLowerCase()] || 0;
  }

  private classifyReferenceType(
    pronoun: string
  ): CrossReference['type'] {
    const pronounLower = pronoun.toLowerCase();
    if (
      ['he', 'she', 'it', 'they', 'him', 'her', 'them'].includes(
        pronounLower
      )
    ) {
      return 'pronoun';
    }
    if (['this', 'that', 'these', 'those'].includes(pronounLower)) {
      return 'definite_reference';
    }
    return 'anaphora';
  }

  private tryResolveReference(
    reference: CrossReference,
    entities: ExtractedEntity[],
    sentences: Array<{ text: string; location: TextLocation }>
  ): boolean {
    // Simple resolution: look for entities in previous sentences
    const relevantEntities = entities.filter(
      (entity) =>
        entity.location.start < reference.location.start &&
        entity.location.start > reference.location.start - 500 // Within 500 chars
    );

    return relevantEntities.length > 0;
  }

  private getContext(
    text: string,
    position: number,
    radius: number
  ): string {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius);
    return text.substring(start, end);
  }

  private getLineNumber(text: string, position: number): number {
    return text.substring(0, position).split('\n').length;
  }

  private getColumnNumber(text: string, position: number): number {
    const lines = text.substring(0, position).split('\n');
    return lines[lines.length - 1].length + 1;
  }
}
