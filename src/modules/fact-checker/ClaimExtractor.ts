import { ParsedContent } from '../../models/core/ParsedContent';
import { Domain } from '../../models/core/ContentTypes';

export interface ExtractedClaim {
  statement: string;
  confidence: number;
  location: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  context: string;
  type:
    | 'factual'
    | 'statistical'
    | 'regulatory'
    | 'medical'
    | 'financial';
}

export class ClaimExtractor {
  private factualPatterns = [
    // Statistical claims
    /(\d+(?:\.\d+)?%?\s+(?:of|percent|percentage)\s+.+)/gi,
    /(.+\s+(?:is|are|was|were)\s+\d+(?:\.\d+)?(?:%|percent|percentage)?)/gi,

    // Definitive statements
    /(.+\s+(?:always|never|all|none|every|must|shall|will|cannot)\s+.+)/gi,
    /(.+\s+(?:requires?|prohibits?|allows?|mandates?)\s+.+)/gi,

    // Comparative claims
    /(.+\s+(?:more|less|higher|lower|better|worse|faster|slower)\s+than\s+.+)/gi,
    /(.+\s+(?:increases?|decreases?|reduces?|improves?|worsens?)\s+.+)/gi,

    // Medical/scientific claims
    /(.+\s+(?:causes?|prevents?|treats?|cures?|diagnoses?)\s+.+)/gi,
    /(.+\s+(?:effective|ineffective|safe|unsafe|toxic|beneficial)\s+.+)/gi,

    // Financial/regulatory claims
    /(.+\s+(?:complies?|violates?|meets?|exceeds?)\s+.+)/gi,
    /(.+\s+(?:costs?|saves?|earns?|loses?)\s+\$?\d+)/gi,
  ];

  private domainKeywords = {
    healthcare: [
      'patient',
      'medical',
      'treatment',
      'diagnosis',
      'medication',
      'therapy',
      'clinical',
      'health',
    ],
    financial: [
      'investment',
      'return',
      'profit',
      'loss',
      'revenue',
      'cost',
      'price',
      'market',
      'financial',
    ],
    legal: [
      'contract',
      'agreement',
      'liability',
      'compliance',
      'regulation',
      'law',
      'legal',
      'court',
    ],
    insurance: [
      'policy',
      'coverage',
      'claim',
      'premium',
      'deductible',
      'benefit',
      'risk',
      'insurance',
    ],
    general: [
      'fact',
      'information',
      'data',
      'evidence',
      'research',
      'study',
      'report',
      'analysis',
    ],
  };

  extractClaims(
    content: ParsedContent,
    domain?: Domain
  ): ExtractedClaim[] {
    const claims: ExtractedClaim[] = [];
    const text = content.extractedText;
    const lines = text.split('\n');

    // Extract claims using pattern matching
    for (const pattern of this.factualPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const statement = match[1].trim();

        if (this.isValidClaim(statement)) {
          const location = this.getLocation(
            text,
            match.index,
            match[0].length
          );
          const context = this.getContext(text, match.index, 100);
          const claimType = this.classifyClaimType(statement, domain);
          const confidence = this.calculateExtractionConfidence(
            statement,
            domain
          );

          claims.push({
            statement,
            confidence,
            location,
            context,
            type: claimType,
          });
        }
      }
    }

    // Remove duplicates and overlapping claims
    return this.deduplicateClaims(claims);
  }

  private isValidClaim(statement: string): boolean {
    // Filter out very short or very long statements
    if (statement.length < 10 || statement.length > 500) {
      return false;
    }

    // Filter out questions
    if (statement.includes('?')) {
      return false;
    }

    // Allow sentences with or without ending punctuation
    // Most extracted claims from patterns will be complete statements

    // Must contain at least one verb
    const verbs = [
      'is',
      'are',
      'was',
      'were',
      'has',
      'have',
      'had',
      'will',
      'would',
      'can',
      'could',
      'should',
      'must',
    ];
    if (
      !verbs.some((verb) => statement.toLowerCase().includes(verb))
    ) {
      return false;
    }

    return true;
  }

  private getLocation(
    text: string,
    start: number,
    length: number
  ): ExtractedClaim['location'] {
    const beforeText = text.substring(0, start);
    const lines = beforeText.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    return {
      start,
      end: start + length,
      line,
      column,
    };
  }

  private getContext(
    text: string,
    position: number,
    contextLength: number
  ): string {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);
    return text.substring(start, end);
  }

  private classifyClaimType(
    statement: string,
    domain?: Domain
  ): ExtractedClaim['type'] {
    const lowerStatement = statement.toLowerCase();

    // Statistical patterns
    if (
      lowerStatement.match(/\d+(?:\.\d+)?%/) ||
      lowerStatement.includes('percent')
    ) {
      return 'statistical';
    }

    // Regulatory patterns
    if (
      lowerStatement.match(
        /(?:requires?|prohibits?|mandates?|complies?|violates?)/
      )
    ) {
      return 'regulatory';
    }

    // Domain-specific classification
    if (domain) {
      const keywords = this.domainKeywords[domain];
      if (
        keywords.some((keyword) => lowerStatement.includes(keyword))
      ) {
        switch (domain) {
          case 'healthcare':
            return 'medical';
          case 'financial':
            return 'financial';
          default:
            return 'factual';
        }
      }
    }

    return 'factual';
  }

  private calculateExtractionConfidence(
    statement: string,
    domain?: Domain
  ): number {
    let confidence = 50; // Base confidence

    // Increase confidence for specific patterns
    if (statement.match(/\d+(?:\.\d+)?%/)) confidence += 20;
    if (statement.match(/(?:always|never|all|none|every)/i))
      confidence += 15;
    if (statement.match(/(?:must|shall|will|cannot)/i))
      confidence += 15;

    // Domain-specific confidence boost
    if (domain) {
      const keywords = this.domainKeywords[domain];
      const keywordCount = keywords.filter((keyword) =>
        statement.toLowerCase().includes(keyword)
      ).length;
      confidence += keywordCount * 5;
    }

    // Reduce confidence for uncertain language
    if (statement.match(/(?:might|maybe|possibly|probably|likely)/i))
      confidence -= 20;
    if (statement.match(/(?:seems?|appears?|suggests?)/i))
      confidence -= 15;

    return Math.max(10, Math.min(95, confidence));
  }

  private deduplicateClaims(
    claims: ExtractedClaim[]
  ): ExtractedClaim[] {
    const deduplicated: ExtractedClaim[] = [];

    for (const claim of claims) {
      const isDuplicate = deduplicated.some((existing) => {
        // Check for exact matches
        if (existing.statement === claim.statement) return true;

        // Check for overlapping locations
        const overlap = Math.max(
          0,
          Math.min(existing.location.end, claim.location.end) -
            Math.max(existing.location.start, claim.location.start)
        );
        const overlapRatio =
          overlap /
          Math.min(
            existing.location.end - existing.location.start,
            claim.location.end - claim.location.start
          );

        return overlapRatio > 0.8;
      });

      if (!isDuplicate) {
        deduplicated.push(claim);
      }
    }

    // Sort by confidence descending
    return deduplicated.sort((a, b) => b.confidence - a.confidence);
  }
}
