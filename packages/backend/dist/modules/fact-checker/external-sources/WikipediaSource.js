"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WikipediaSource = void 0;
class WikipediaSource {
    constructor(config) {
        this.name = 'Wikipedia';
        this.baseUrl = 'https://en.wikipedia.org/api/rest_v1';
        this.reliability = 75; // Wikipedia is generally reliable but not authoritative
        this.supportedDomains = [
            'healthcare',
            'financial',
            'legal',
            'insurance',
        ];
        this.config = {
            name: this.name,
            baseUrl: this.baseUrl,
            timeout: 5000,
            maxRetries: 3,
            reliability: this.reliability,
            supportedDomains: this.supportedDomains,
            enabled: true,
            ...config,
        };
    }
    async query(query) {
        const startTime = Date.now();
        try {
            if (!this.config.enabled) {
                return this.createEmptyResult(startTime);
            }
            // In a real implementation, this would make actual API calls to Wikipedia
            // For now, we'll simulate the behavior
            const searchResults = await this.simulateWikipediaSearch(query.statement);
            const sources = searchResults.map((result, index) => ({
                id: `wikipedia-${Date.now()}-${index}`,
                name: 'Wikipedia',
                title: result.title,
                url: result.url,
                type: 'encyclopedia',
                sourceType: 'encyclopedia',
                credibilityScore: this.getReliabilityForDomain(query.domain || 'healthcare'),
                publishDate: result.lastModified,
                lastUpdated: result.lastModified,
                lastVerified: new Date(),
            }));
            const confidence = this.calculateConfidence(searchResults, query.statement);
            const isSupported = confidence > 60;
            const evidence = searchResults.map((r) => r.extract);
            const contradictions = []; // Would be populated by actual analysis
            return {
                sources,
                confidence,
                queryTime: Math.max(1, Date.now() - startTime),
                isSupported,
                evidence,
                contradictions,
            };
        }
        catch (error) {
            console.warn(`Wikipedia source query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return this.createEmptyResult(startTime);
        }
    }
    async isAvailable() {
        try {
            // In real implementation, would ping Wikipedia API
            // For now, simulate availability check
            return this.config.enabled && Math.random() > 0.1; // 90% availability
        }
        catch {
            return false;
        }
    }
    getReliabilityForDomain(domain) {
        // Wikipedia reliability varies by domain
        const domainReliability = {
            healthcare: 70, // Medical info can be outdated
            financial: 75, // Generally good for basic financial concepts
            legal: 65, // Legal info may not be jurisdiction-specific
            insurance: 70, // Basic insurance concepts are well covered
        };
        return (domainReliability[domain] ||
            this.reliability);
    }
    async simulateWikipediaSearch(statement) {
        // Simulate Wikipedia search results based on statement keywords
        const keywords = statement
            .toLowerCase()
            .split(' ')
            .filter((word) => word.length > 3);
        if (keywords.length === 0) {
            return [];
        }
        // Mock results based on common medical/financial terms
        const mockResults = [
            {
                title: `${keywords[0]} - Wikipedia`,
                url: `https://en.wikipedia.org/wiki/${keywords[0]}`,
                extract: `${statement} is a topic covered in medical literature with various perspectives.`,
                lastModified: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
            },
        ];
        // Add more results for complex queries
        if (keywords.length > 1) {
            mockResults.push({
                title: `${keywords[1]} - Wikipedia`,
                url: `https://en.wikipedia.org/wiki/${keywords[1]}`,
                extract: `Related information about ${keywords[1]} and its connection to ${keywords[0]}.`,
                lastModified: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
            });
        }
        return mockResults;
    }
    calculateConfidence(results, statement) {
        if (results.length === 0)
            return 0;
        // Simple confidence calculation based on result count and keyword matching
        const baseConfidence = Math.min(results.length * 20, 80);
        const keywordBonus = statement.split(' ').length > 3 ? 10 : 0;
        return Math.min(baseConfidence + keywordBonus, 95);
    }
    createEmptyResult(startTime) {
        return {
            sources: [],
            confidence: 0,
            queryTime: Math.max(1, Date.now() - startTime),
            isSupported: false,
            evidence: [],
            contradictions: [],
        };
    }
}
exports.WikipediaSource = WikipediaSource;
//# sourceMappingURL=WikipediaSource.js.map