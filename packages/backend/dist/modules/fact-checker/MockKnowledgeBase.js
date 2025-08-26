"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockKnowledgeBase = void 0;
class MockKnowledgeBase {
    constructor() {
        this.claims = new Map();
        this.sources = new Map();
        this.initializeMockData();
    }
    async searchClaims(query) {
        const startTime = Date.now();
        const matchingClaims = Array.from(this.claims.values()).filter((claim) => {
            // Simple text matching - in real implementation would use semantic search
            const queryWords = query.statement.toLowerCase().split(' ');
            const claimWords = claim.statement.toLowerCase().split(' ');
            // Check for word overlap
            const commonWords = queryWords.filter((word) => word.length > 2 &&
                claimWords.some((claimWord) => claimWord.includes(word) || word.includes(claimWord)));
            const statementMatch = commonWords.length >= Math.min(2, queryWords.length);
            const domainMatch = !query.domain || claim.domain === query.domain;
            return statementMatch && domainMatch;
        });
        const limitedClaims = matchingClaims.slice(0, query.maxResults || 10);
        const allSources = limitedClaims.flatMap((claim) => claim.sources);
        const confidence = limitedClaims.length > 0
            ? limitedClaims.reduce((sum, claim) => sum + claim.confidence, 0) / limitedClaims.length
            : 0;
        return {
            claims: limitedClaims,
            confidence,
            queryTime: Math.max(1, Date.now() - startTime), // Ensure at least 1ms
            sources: allSources,
        };
    }
    async addClaim(claim) {
        this.claims.set(claim.id, claim);
        // Add sources if they don't exist
        for (const source of claim.sources) {
            if (!this.sources.has(source.id)) {
                this.sources.set(source.id, source);
            }
        }
    }
    async updateClaim(claimId, updates) {
        const existingClaim = this.claims.get(claimId);
        if (!existingClaim) {
            throw new Error(`Claim with id ${claimId} not found`);
        }
        const updatedClaim = { ...existingClaim, ...updates };
        this.claims.set(claimId, updatedClaim);
    }
    async verifyClaim(statement, domain) {
        const searchResult = await this.searchClaims({
            statement,
            domain,
        });
        const supportingSources = [];
        const contradictingSources = [];
        for (const claim of searchResult.claims) {
            if (claim.confidence > 70) {
                supportingSources.push(...claim.sources);
            }
            else if (claim.contradictions?.some((contradiction) => contradiction
                .toLowerCase()
                .includes(statement.toLowerCase()))) {
                contradictingSources.push(...claim.sources);
            }
        }
        const isSupported = supportingSources.length > contradictingSources.length;
        const confidence = searchResult.confidence;
        return {
            isSupported,
            confidence,
            supportingSources,
            contradictingSources,
        };
    }
    async getSourceCredibility(sourceId) {
        const source = this.sources.get(sourceId);
        return source?.credibilityScore || 0;
    }
    async updateSourceCredibility(sourceId, feedback) {
        const source = this.sources.get(sourceId);
        if (!source) {
            throw new Error(`Source with id ${sourceId} not found`);
        }
        const adjustment = feedback === 'positive' ? 5 : -5;
        const newScore = Math.max(0, Math.min(100, source.credibilityScore + adjustment));
        this.sources.set(sourceId, {
            ...source,
            credibilityScore: newScore,
            lastVerified: new Date(),
        });
    }
    initializeMockData() {
        // Mock sources
        const mockSources = [
            {
                id: 'src-1',
                name: 'Medical Research Database',
                title: 'Medical Research Database',
                type: 'academic',
                sourceType: 'academic',
                credibilityScore: 95,
                url: 'https://pubmed.ncbi.nlm.nih.gov',
                lastUpdated: new Date('2024-01-01'),
                lastVerified: new Date('2024-01-01'),
            },
            {
                id: 'src-2',
                name: 'FDA Guidelines',
                title: 'FDA Guidelines',
                type: 'government',
                sourceType: 'government',
                credibilityScore: 98,
                url: 'https://www.fda.gov',
                lastUpdated: new Date('2024-01-01'),
                lastVerified: new Date('2024-01-01'),
            },
            {
                id: 'src-3',
                name: 'Financial Industry Standards',
                title: 'Financial Industry Standards',
                type: 'industry',
                sourceType: 'industry',
                credibilityScore: 85,
                url: 'https://www.finra.org',
                lastUpdated: new Date('2024-01-01'),
                lastVerified: new Date('2024-01-01'),
            },
        ];
        mockSources.forEach((source) => this.sources.set(source.id, source));
        // Mock claims
        const mockClaims = [
            {
                id: 'claim-1',
                statement: 'Aspirin reduces the risk of heart attack',
                sources: [mockSources[0], mockSources[1]],
                confidence: 92,
                domain: 'healthcare',
                verified: true,
                createdAt: new Date('2024-01-01'),
                lastVerified: new Date('2024-01-01'),
            },
            {
                id: 'claim-2',
                statement: 'FDIC insurance covers deposits up to $250,000',
                sources: [mockSources[2]],
                confidence: 98,
                domain: 'financial',
                verified: true,
                createdAt: new Date('2024-01-01'),
                lastVerified: new Date('2024-01-01'),
            },
            {
                id: 'claim-3',
                statement: 'HIPAA requires patient consent for data sharing',
                sources: [mockSources[1]],
                confidence: 95,
                domain: 'healthcare',
                verified: true,
                createdAt: new Date('2024-01-01'),
                lastVerified: new Date('2024-01-01'),
            },
        ];
        mockClaims.forEach((claim) => this.claims.set(claim.id, claim));
    }
}
exports.MockKnowledgeBase = MockKnowledgeBase;
//# sourceMappingURL=MockKnowledgeBase.js.map