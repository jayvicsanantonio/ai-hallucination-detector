import { Source } from '../../models/knowledge/Source';
import { SourceType } from '../../models/core/ContentTypes';

export interface CredibilityFactors {
  sourceType: number;
  recency: number;
  authorCredibility: number;
  domainRelevance: number;
  verificationHistory: number;
  citationCount: number;
}

export interface CredibilityAssessment {
  overallScore: number;
  factors: CredibilityFactors;
  reasoning: string[];
  confidence: number;
}

export class SourceCredibilityScorer {
  private sourceTypeWeights: Record<SourceType, number> = {
    government: 95,
    academic: 90,
    industry: 75,
    news: 60,
    encyclopedia: 80,
    internal: 70,
    other: 50,
  };

  private domainAuthorityPatterns = {
    healthcare: [
      'nih.gov',
      'cdc.gov',
      'fda.gov',
      'who.int',
      'pubmed.ncbi.nlm.nih.gov',
      'nejm.org',
      'bmj.com',
      'thelancet.com',
      'jama.jamanetwork.com',
    ],
    financial: [
      'sec.gov',
      'federalreserve.gov',
      'treasury.gov',
      'finra.org',
      'bloomberg.com',
      'reuters.com',
      'wsj.com',
      'ft.com',
    ],
    legal: [
      'supremecourt.gov',
      'uscourts.gov',
      'justice.gov',
      'law.cornell.edu',
      'westlaw.com',
      'lexisnexis.com',
      'justia.com',
    ],
    insurance: [
      'naic.org',
      'iii.org',
      'irmi.com',
      'riskandinsurance.com',
    ],
  };

  assessCredibility(
    source: Source,
    domain?: string
  ): CredibilityAssessment {
    const factors: CredibilityFactors = {
      sourceType: this.scoreSourceType(source.sourceType || 'other'),
      recency: this.scoreRecency(
        source.publishDate,
        source.lastVerified
      ),
      authorCredibility: this.scoreAuthor(source.author),
      domainRelevance: this.scoreDomainRelevance(source, domain),
      verificationHistory: this.scoreVerificationHistory(source),
      citationCount: this.scoreCitationCount(source),
    };

    const overallScore = this.calculateOverallScore(factors);
    const reasoning = this.generateReasoning(factors, source);
    const confidence = this.calculateConfidence(factors);

    return {
      overallScore,
      factors,
      reasoning,
      confidence,
    };
  }

  updateCredibilityFromFeedback(
    currentScore: number,
    feedback: 'positive' | 'negative',
    feedbackWeight: number = 1.0
  ): number {
    const adjustment =
      feedback === 'positive'
        ? Math.min(5 * feedbackWeight, 100 - currentScore)
        : Math.max(-5 * feedbackWeight, -currentScore);

    return Math.max(0, Math.min(100, currentScore + adjustment));
  }

  compareSourceCredibility(
    sources: Source[],
    domain?: string
  ): Source[] {
    const assessments = sources.map((source) => ({
      source,
      assessment: this.assessCredibility(source, domain),
    }));

    return assessments
      .sort(
        (a, b) =>
          b.assessment.overallScore - a.assessment.overallScore
      )
      .map((item) => item.source);
  }

  private scoreSourceType(sourceType: SourceType): number {
    return this.sourceTypeWeights[sourceType] || 50;
  }

  private scoreRecency(
    publishDate?: Date,
    lastVerified?: Date
  ): number {
    const now = new Date();
    const relevantDate = lastVerified || publishDate;

    if (!relevantDate) return 30; // Low score for unknown dates

    const ageInDays =
      (now.getTime() - relevantDate.getTime()) /
      (1000 * 60 * 60 * 24);

    if (ageInDays <= 30) return 100; // Very recent
    if (ageInDays <= 90) return 90; // Recent
    if (ageInDays <= 365) return 75; // Within a year
    if (ageInDays <= 1095) return 60; // Within 3 years
    if (ageInDays <= 1825) return 40; // Within 5 years
    return 20; // Older than 5 years
  }

  private scoreAuthor(author?: string): number {
    if (!author) return 50;

    // Simple heuristics - in real implementation would check against author database
    if (author.includes('Dr.') || author.includes('PhD')) return 85;
    if (author.includes('Prof.') || author.includes('Professor'))
      return 90;
    if (author.includes('MD')) return 88;
    if (author.includes('JD')) return 82;

    // Check for institutional affiliations
    const institutionalKeywords = [
      'University',
      'Institute',
      'Department',
      'Center',
    ];
    if (
      institutionalKeywords.some((keyword) =>
        author.includes(keyword)
      )
    )
      return 80;

    return 60; // Default for named authors
  }

  private scoreDomainRelevance(
    source: Source,
    domain?: string
  ): number {
    if (!domain || !source.url) return 70; // Neutral score

    const domainPatterns =
      this.domainAuthorityPatterns[
        domain as keyof typeof this.domainAuthorityPatterns
      ];
    if (!domainPatterns) return 70;

    const isAuthoritative = domainPatterns.some((pattern) =>
      source.url?.toLowerCase().includes(pattern.toLowerCase())
    );

    return isAuthoritative ? 95 : 60;
  }

  private scoreVerificationHistory(source: Source): number {
    // In real implementation, would check historical accuracy
    // For now, use existing credibility score as proxy
    return source.credibilityScore || 70;
  }

  private scoreCitationCount(source: Source): number {
    // In real implementation, would check citation databases
    // For now, estimate based on source type and age
    if (source.sourceType === 'academic') return 85;
    if (source.sourceType === 'government') return 80;
    return 60;
  }

  private calculateOverallScore(factors: CredibilityFactors): number {
    const weights = {
      sourceType: 0.25,
      recency: 0.15,
      authorCredibility: 0.2,
      domainRelevance: 0.2,
      verificationHistory: 0.15,
      citationCount: 0.05,
    };

    return Math.round(
      factors.sourceType * weights.sourceType +
        factors.recency * weights.recency +
        factors.authorCredibility * weights.authorCredibility +
        factors.domainRelevance * weights.domainRelevance +
        factors.verificationHistory * weights.verificationHistory +
        factors.citationCount * weights.citationCount
    );
  }

  private generateReasoning(
    factors: CredibilityFactors,
    source: Source
  ): string[] {
    const reasoning: string[] = [];

    if (factors.sourceType >= 90) {
      reasoning.push(
        `High credibility source type: ${source.sourceType}`
      );
    } else if (factors.sourceType <= 60) {
      reasoning.push(
        `Lower credibility source type: ${source.sourceType}`
      );
    }

    if (factors.recency >= 90) {
      reasoning.push('Very recent information');
    } else if (factors.recency <= 40) {
      reasoning.push('Information may be outdated');
    }

    if (factors.authorCredibility >= 85) {
      reasoning.push('Author has strong credentials');
    } else if (factors.authorCredibility <= 50) {
      reasoning.push('Author credentials unknown or limited');
    }

    if (factors.domainRelevance >= 90) {
      reasoning.push('Source is highly relevant to domain');
    } else if (factors.domainRelevance <= 60) {
      reasoning.push('Source relevance to domain is limited');
    }

    return reasoning;
  }

  private calculateConfidence(factors: CredibilityFactors): number {
    // Higher confidence when we have more information
    let confidence = 50;

    if (factors.authorCredibility > 50) confidence += 15;
    if (factors.recency > 70) confidence += 15;
    if (factors.domainRelevance > 80) confidence += 10;
    if (factors.verificationHistory > 70) confidence += 10;

    return Math.min(95, confidence);
  }
}
