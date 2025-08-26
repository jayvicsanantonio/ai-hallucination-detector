import {
  FactChecker as IFactChecker,
  FactCheckingRequest,
  FactCheckingResult,
  FactualIssue,
  VerifiedClaim,
} from './interfaces/FactChecker';
import { KnowledgeBase } from './interfaces/KnowledgeBase';
import { ClaimExtractor, ExtractedClaim } from './ClaimExtractor';
import { SourceCredibilityScorer } from './SourceCredibilityScorer';
import { ExternalSourceManager } from './ExternalSourceManager';
import { ParsedContent } from '../../models/core/ParsedContent';
import { Domain } from '../../models/core/ContentTypes';
import { v4 as uuidv4 } from 'uuid';

export class FactChecker implements IFactChecker {
  private knowledgeBase: KnowledgeBase;
  private claimExtractor: ClaimExtractor;
  private credibilityScorer: SourceCredibilityScorer;
  private externalSourceManager: ExternalSourceManager;

  constructor(
    knowledgeBase: KnowledgeBase,
    externalSourceManager?: ExternalSourceManager
  ) {
    this.knowledgeBase = knowledgeBase;
    this.claimExtractor = new ClaimExtractor();
    this.credibilityScorer = new SourceCredibilityScorer();
    this.externalSourceManager =
      externalSourceManager || new ExternalSourceManager();
  }

  async checkFacts(
    request: FactCheckingRequest
  ): Promise<FactCheckingResult> {
    const startTime = Date.now();
    const verificationId = uuidv4();

    try {
      // Extract claims from content
      const extractedClaims = this.claimExtractor.extractClaims(
        request.content,
        request.domain
      );

      // Verify each claim
      const verificationPromises = extractedClaims.map((claim) =>
        this.verifyExtractedClaim(
          claim,
          request.domain,
          request.strictMode
        )
      );

      const verificationResults = await Promise.all(
        verificationPromises
      );

      // Separate issues from verified claims
      const factualIssues: FactualIssue[] = [];
      const verifiedClaims: VerifiedClaim[] = [];
      const sourcesUsed = new Set<string>();

      for (const result of verificationResults) {
        if (result.issue) {
          factualIssues.push(result.issue);
        }
        if (result.verifiedClaim) {
          verifiedClaims.push(result.verifiedClaim);
        }
        result.sources.forEach((source) => sourcesUsed.add(source));
      }

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(
        factualIssues,
        verifiedClaims,
        extractedClaims.length
      );

      const processingTime = Date.now() - startTime;

      return {
        verificationId,
        overallConfidence,
        factualIssues,
        verifiedClaims,
        processingTime,
        sourcesUsed: Array.from(sourcesUsed),
      };
    } catch (error) {
      throw new Error(
        `Fact checking failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async extractClaims(content: ParsedContent): Promise<string[]> {
    const extractedClaims =
      this.claimExtractor.extractClaims(content);
    return extractedClaims.map((claim) => claim.statement);
  }

  async verifyClaim(
    claim: string,
    domain?: Domain
  ): Promise<VerifiedClaim> {
    const verificationResult = await this.knowledgeBase.verifyClaim(
      claim,
      domain
    );

    const sources = verificationResult.supportingSources.map(
      (source) => source.id
    );
    const verificationMethod = verificationResult.isSupported
      ? 'knowledge_base_match'
      : 'knowledge_base_search';

    return {
      statement: claim,
      confidence: verificationResult.confidence,
      sources,
      verificationMethod,
    };
  }

  private async verifyExtractedClaim(
    extractedClaim: ExtractedClaim,
    domain?: Domain,
    strictMode?: boolean
  ): Promise<{
    issue?: FactualIssue;
    verifiedClaim?: VerifiedClaim;
    sources: string[];
  }> {
    // First check internal knowledge base
    const internalResult = await this.knowledgeBase.verifyClaim(
      extractedClaim.statement,
      domain
    );

    // Then check external sources for additional verification
    const externalResult =
      await this.externalSourceManager.queryBestSource({
        statement: extractedClaim.statement,
        domain,
        maxResults: 3,
        timeout: 5000,
      });

    // Combine results from internal and external sources
    const allSources = [
      ...internalResult.supportingSources.map((s) => s.id),
      ...internalResult.contradictingSources.map((s) => s.id),
      ...externalResult.sources.map((s) => s.id),
    ];

    // Calculate combined confidence
    const internalWeight = 0.6; // Internal knowledge base weight
    const externalWeight = 0.4; // External sources weight

    const combinedConfidence = Math.round(
      internalResult.confidence * internalWeight +
        externalResult.overallConfidence * externalWeight
    );

    const confidenceThreshold = strictMode ? 80 : 60;
    const isSupported =
      internalResult.isSupported || externalResult.isSupported;

    if (!isSupported || combinedConfidence < confidenceThreshold) {
      // Create factual issue
      let issueType: FactualIssue['type'] = 'unsupported_claim';

      if (
        internalResult.contradictingSources.length > 0 ||
        externalResult.contradictions.length > 0
      ) {
        issueType = 'contradicted_claim';
      }

      const evidence = [
        ...internalResult.supportingSources.map(
          (s) => `Internal: ${s.title}`
        ),
        ...internalResult.contradictingSources.map(
          (s) => `Internal (contradicting): ${s.title}`
        ),
        ...externalResult.evidence.map((e) => `External: ${e}`),
        ...externalResult.contradictions.map(
          (c) => `External (contradicting): ${c}`
        ),
      ];

      const issue: FactualIssue = {
        id: uuidv4(),
        type: issueType,
        statement: extractedClaim.statement,
        location: extractedClaim.location,
        confidence: Math.max(
          extractedClaim.confidence,
          combinedConfidence
        ),
        evidence,
        sources: allSources,
        suggestedCorrection: await this.generateSuggestedCorrection(
          extractedClaim.statement,
          [
            ...internalResult.supportingSources,
            ...externalResult.sources,
          ]
        ),
      };

      return { issue, sources: allSources };
    } else {
      // Create verified claim
      const verifiedClaim: VerifiedClaim = {
        statement: extractedClaim.statement,
        confidence: combinedConfidence,
        sources: [
          ...internalResult.supportingSources.map((s) => s.id),
          ...externalResult.sources.map((s) => s.id),
        ],
        verificationMethod:
          externalResult.sources.length > 0
            ? 'combined_internal_external'
            : 'knowledge_base_verification',
      };

      return { verifiedClaim, sources: allSources };
    }
  }

  private calculateOverallConfidence(
    issues: FactualIssue[],
    verifiedClaims: VerifiedClaim[],
    totalClaims: number
  ): number {
    if (totalClaims === 0) return 100;

    const issueWeight = issues.reduce((sum, issue) => {
      const severity =
        issue.type === 'contradicted_claim' ? 0.8 : 0.6;
      return sum + (issue.confidence / 100) * severity;
    }, 0);

    const verifiedWeight = verifiedClaims.reduce(
      (sum, claim) => sum + claim.confidence / 100,
      0
    );

    const unverifiedClaims =
      totalClaims - issues.length - verifiedClaims.length;
    const unverifiedWeight = unverifiedClaims * 0.5; // Neutral weight for unverified

    const totalWeight =
      issueWeight + verifiedWeight + unverifiedWeight;
    const positiveWeight = verifiedWeight + unverifiedWeight;

    const confidence =
      totalWeight > 0 ? (positiveWeight / totalWeight) * 100 : 100;

    return Math.round(Math.max(0, Math.min(100, confidence)));
  }

  private async generateSuggestedCorrection(
    statement: string,
    supportingSources: any[]
  ): Promise<string | undefined> {
    if (supportingSources.length === 0) {
      return undefined;
    }

    // Simple correction suggestion - in real implementation would use NLP
    const highestCredibilitySource = supportingSources.reduce(
      (best, current) =>
        current.credibilityScore > best.credibilityScore
          ? current
          : best
    );

    return `Consider verifying against: ${highestCredibilitySource.title}`;
  }
}
