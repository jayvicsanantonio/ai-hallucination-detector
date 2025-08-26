"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactChecker = void 0;
const ClaimExtractor_1 = require("./ClaimExtractor");
const SourceCredibilityScorer_1 = require("./SourceCredibilityScorer");
const ExternalSourceManager_1 = require("./ExternalSourceManager");
const uuid_1 = require("uuid");
class FactChecker {
    constructor(knowledgeBase, externalSourceManager) {
        this.knowledgeBase = knowledgeBase;
        this.claimExtractor = new ClaimExtractor_1.ClaimExtractor();
        this.credibilityScorer = new SourceCredibilityScorer_1.SourceCredibilityScorer();
        this.externalSourceManager =
            externalSourceManager || new ExternalSourceManager_1.ExternalSourceManager();
    }
    async checkFacts(request) {
        const startTime = Date.now();
        const verificationId = (0, uuid_1.v4)();
        try {
            // Extract claims from content
            const extractedClaims = this.claimExtractor.extractClaims(request.content, request.domain);
            // Verify each claim
            const verificationPromises = extractedClaims.map((claim) => this.verifyExtractedClaim(claim, request.domain, request.strictMode));
            const verificationResults = await Promise.all(verificationPromises);
            // Separate issues from verified claims
            const factualIssues = [];
            const verifiedClaims = [];
            const sourcesUsed = new Set();
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
            const overallConfidence = this.calculateOverallConfidence(factualIssues, verifiedClaims, extractedClaims.length);
            const processingTime = Date.now() - startTime;
            return {
                verificationId,
                overallConfidence,
                factualIssues,
                verifiedClaims,
                processingTime,
                sourcesUsed: Array.from(sourcesUsed),
            };
        }
        catch (error) {
            throw new Error(`Fact checking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async extractClaims(content) {
        const extractedClaims = this.claimExtractor.extractClaims(content);
        return extractedClaims.map((claim) => claim.statement);
    }
    async verifyClaim(claim, domain) {
        const verificationResult = await this.knowledgeBase.verifyClaim(claim, domain);
        const sources = verificationResult.supportingSources.map((source) => source.id);
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
    async verifyExtractedClaim(extractedClaim, domain, strictMode) {
        // First check internal knowledge base
        const internalResult = await this.knowledgeBase.verifyClaim(extractedClaim.statement, domain);
        // Then check external sources for additional verification
        const externalResult = await this.externalSourceManager.queryBestSource({
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
        const combinedConfidence = Math.round(internalResult.confidence * internalWeight +
            externalResult.overallConfidence * externalWeight);
        const confidenceThreshold = strictMode ? 80 : 60;
        const isSupported = internalResult.isSupported || externalResult.isSupported;
        if (!isSupported || combinedConfidence < confidenceThreshold) {
            // Create factual issue
            let issueType = 'unsupported_claim';
            if (internalResult.contradictingSources.length > 0 ||
                externalResult.contradictions.length > 0) {
                issueType = 'contradicted_claim';
            }
            const evidence = [
                ...internalResult.supportingSources.map((s) => `Internal: ${s.title}`),
                ...internalResult.contradictingSources.map((s) => `Internal (contradicting): ${s.title}`),
                ...externalResult.evidence.map((e) => `External: ${e}`),
                ...externalResult.contradictions.map((c) => `External (contradicting): ${c}`),
            ];
            const issue = {
                id: (0, uuid_1.v4)(),
                type: issueType,
                statement: extractedClaim.statement,
                location: extractedClaim.location,
                confidence: Math.max(extractedClaim.confidence, combinedConfidence),
                evidence,
                sources: allSources,
                suggestedCorrection: await this.generateSuggestedCorrection(extractedClaim.statement, [
                    ...internalResult.supportingSources,
                    ...externalResult.sources,
                ]),
            };
            return { issue, sources: allSources };
        }
        else {
            // Create verified claim
            const verifiedClaim = {
                statement: extractedClaim.statement,
                confidence: combinedConfidence,
                sources: [
                    ...internalResult.supportingSources.map((s) => s.id),
                    ...externalResult.sources.map((s) => s.id),
                ],
                verificationMethod: externalResult.sources.length > 0
                    ? 'combined_internal_external'
                    : 'knowledge_base_verification',
            };
            return { verifiedClaim, sources: allSources };
        }
    }
    calculateOverallConfidence(issues, verifiedClaims, totalClaims) {
        if (totalClaims === 0)
            return 100;
        const issueWeight = issues.reduce((sum, issue) => {
            const severity = issue.type === 'contradicted_claim' ? 0.8 : 0.6;
            return sum + (issue.confidence / 100) * severity;
        }, 0);
        const verifiedWeight = verifiedClaims.reduce((sum, claim) => sum + claim.confidence / 100, 0);
        const unverifiedClaims = totalClaims - issues.length - verifiedClaims.length;
        const unverifiedWeight = unverifiedClaims * 0.5; // Neutral weight for unverified
        const totalWeight = issueWeight + verifiedWeight + unverifiedWeight;
        const positiveWeight = verifiedWeight + unverifiedWeight;
        const confidence = totalWeight > 0 ? (positiveWeight / totalWeight) * 100 : 100;
        return Math.round(Math.max(0, Math.min(100, confidence)));
    }
    async generateSuggestedCorrection(statement, supportingSources) {
        if (supportingSources.length === 0) {
            return undefined;
        }
        // Simple correction suggestion - in real implementation would use NLP
        const highestCredibilitySource = supportingSources.reduce((best, current) => current.credibilityScore > best.credibilityScore
            ? current
            : best);
        return `Consider verifying against: ${highestCredibilitySource.title}`;
    }
}
exports.FactChecker = FactChecker;
//# sourceMappingURL=FactChecker.js.map