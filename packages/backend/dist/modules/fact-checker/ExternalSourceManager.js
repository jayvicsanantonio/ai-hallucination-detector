"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalSourceManager = void 0;
const WikipediaSource_1 = require("./external-sources/WikipediaSource");
const GovernmentDataSource_1 = require("./external-sources/GovernmentDataSource");
class ExternalSourceManager {
    constructor() {
        this.sources = new Map();
        this.reliabilityConfig = new Map();
        this.fallbackEnabled = true;
        this.initializeDefaultSources();
        this.initializeReliabilityConfig();
    }
    async queryAllSources(query) {
        const startTime = Date.now();
        const availableSources = [];
        const unavailableSources = [];
        const sourceResults = [];
        // Check availability and query each source
        for (const [sourceName, source] of this.sources) {
            try {
                const isAvailable = await source.isAvailable();
                if (isAvailable) {
                    availableSources.push(sourceName);
                    const result = await source.query(query);
                    sourceResults.push({ source: sourceName, result });
                }
                else {
                    unavailableSources.push(sourceName);
                }
            }
            catch (error) {
                console.warn(`Source ${sourceName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                unavailableSources.push(sourceName);
            }
        }
        // Apply fallback mechanisms if no sources are available
        if (sourceResults.length === 0 && this.fallbackEnabled) {
            return this.createFallbackResult(query, startTime, unavailableSources);
        }
        // Consolidate results from multiple sources
        return this.consolidateResults(sourceResults, query, startTime, availableSources, unavailableSources);
    }
    async queryBestSource(query) {
        const startTime = Date.now();
        // Get sources sorted by reliability for the domain
        const sortedSources = this.getSortedSourcesByReliability(query.domain);
        for (const [sourceName, source] of sortedSources) {
            try {
                const isAvailable = await source.isAvailable();
                if (isAvailable) {
                    const result = await source.query(query);
                    // If we get a confident result, use it
                    if (result.confidence > 70) {
                        return {
                            sources: result.sources,
                            overallConfidence: result.confidence,
                            isSupported: result.isSupported,
                            evidence: result.evidence,
                            contradictions: result.contradictions,
                            sourceReliabilityWeights: { [sourceName]: 1.0 },
                            queryTime: Math.max(1, Date.now() - startTime),
                            availableSources: [sourceName],
                            unavailableSources: [],
                        };
                    }
                }
            }
            catch (error) {
                console.warn(`Source ${sourceName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                continue;
            }
        }
        // If no single source provides confident results, fall back to querying all
        return this.queryAllSources(query);
    }
    addSource(source, reliabilityConfig) {
        this.sources.set(source.name, source);
        if (reliabilityConfig) {
            this.reliabilityConfig.set(source.name, reliabilityConfig);
        }
        else {
            // Create default reliability config
            this.reliabilityConfig.set(source.name, {
                sourceName: source.name,
                baseWeight: source.reliability / 100,
                domainWeights: {},
                enabled: true,
            });
        }
    }
    removeSource(sourceName) {
        this.sources.delete(sourceName);
        this.reliabilityConfig.delete(sourceName);
    }
    updateSourceReliability(sourceName, feedback, domain) {
        const config = this.reliabilityConfig.get(sourceName);
        if (!config)
            return;
        const adjustment = feedback === 'positive' ? 0.05 : -0.05;
        if (domain) {
            const currentWeight = config.domainWeights[domain] || config.baseWeight;
            config.domainWeights[domain] = Math.max(0, Math.min(1, currentWeight + adjustment));
        }
        else {
            config.baseWeight = Math.max(0, Math.min(1, config.baseWeight + adjustment));
        }
    }
    setFallbackEnabled(enabled) {
        this.fallbackEnabled = enabled;
    }
    initializeDefaultSources() {
        this.sources.set('Wikipedia', new WikipediaSource_1.WikipediaSource());
        this.sources.set('Government Data', new GovernmentDataSource_1.GovernmentDataSource());
    }
    initializeReliabilityConfig() {
        this.reliabilityConfig.set('Wikipedia', {
            sourceName: 'Wikipedia',
            baseWeight: 0.75,
            domainWeights: {
                healthcare: 0.7,
                financial: 0.75,
                legal: 0.65,
                insurance: 0.7,
            },
            enabled: true,
        });
        this.reliabilityConfig.set('Government Data', {
            sourceName: 'Government Data',
            baseWeight: 0.95,
            domainWeights: {
                healthcare: 0.98,
                financial: 0.95,
                legal: 0.97,
                insurance: 0.9,
            },
            enabled: true,
        });
    }
    getSortedSourcesByReliability(domain) {
        const sourceEntries = Array.from(this.sources.entries());
        return sourceEntries.sort(([nameA], [nameB]) => {
            const configA = this.reliabilityConfig.get(nameA);
            const configB = this.reliabilityConfig.get(nameB);
            if (!configA || !configB)
                return 0;
            const weightA = domain
                ? configA.domainWeights[domain] || configA.baseWeight
                : configA.baseWeight;
            const weightB = domain
                ? configB.domainWeights[domain] || configB.baseWeight
                : configB.baseWeight;
            return weightB - weightA; // Sort descending
        });
    }
    consolidateResults(sourceResults, query, startTime, availableSources, unavailableSources) {
        if (sourceResults.length === 0) {
            return this.createEmptyResult(startTime, availableSources, unavailableSources);
        }
        // Collect all sources and evidence
        const allSources = [];
        const allEvidence = [];
        const allContradictions = [];
        const sourceWeights = {};
        let weightedConfidenceSum = 0;
        let totalWeight = 0;
        let supportingWeight = 0;
        for (const { source, result } of sourceResults) {
            const config = this.reliabilityConfig.get(source);
            const weight = config
                ? query.domain
                    ? config.domainWeights[query.domain] || config.baseWeight
                    : config.baseWeight
                : 0.5;
            sourceWeights[source] = weight;
            allSources.push(...result.sources);
            allEvidence.push(...result.evidence);
            allContradictions.push(...result.contradictions);
            weightedConfidenceSum += result.confidence * weight;
            totalWeight += weight;
            if (result.isSupported) {
                supportingWeight += weight;
            }
        }
        const overallConfidence = totalWeight > 0 ? weightedConfidenceSum / totalWeight : 0;
        const isSupported = supportingWeight > totalWeight / 2;
        return {
            sources: this.deduplicateSources(allSources),
            overallConfidence: Math.round(overallConfidence),
            isSupported,
            evidence: [...new Set(allEvidence)], // Remove duplicates
            contradictions: [...new Set(allContradictions)],
            sourceReliabilityWeights: sourceWeights,
            queryTime: Math.max(1, Date.now() - startTime),
            availableSources,
            unavailableSources,
        };
    }
    createFallbackResult(query, startTime, unavailableSources) {
        // When all sources are unavailable, return a conservative result
        return {
            sources: [],
            overallConfidence: 0,
            isSupported: false,
            evidence: ['No external sources available for verification'],
            contradictions: [],
            sourceReliabilityWeights: {},
            queryTime: Math.max(1, Date.now() - startTime),
            availableSources: [],
            unavailableSources,
        };
    }
    createEmptyResult(startTime, availableSources, unavailableSources) {
        return {
            sources: [],
            overallConfidence: 0,
            isSupported: false,
            evidence: [],
            contradictions: [],
            sourceReliabilityWeights: {},
            queryTime: Math.max(1, Date.now() - startTime),
            availableSources,
            unavailableSources,
        };
    }
    deduplicateSources(sources) {
        const seen = new Set();
        return sources.filter((source) => {
            const key = `${source.url || source.title}-${source.sourceType}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}
exports.ExternalSourceManager = ExternalSourceManager;
//# sourceMappingURL=ExternalSourceManager.js.map