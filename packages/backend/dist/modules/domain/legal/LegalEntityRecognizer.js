"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalEntityRecognizer = void 0;
class LegalEntityRecognizer {
    constructor() {
        this.entityPatterns = new Map();
        this.jurisdictionPatterns = new Map();
        this.initializeEntityPatterns();
        this.initializeJurisdictionPatterns();
    }
    async extractLegalEntities(content) {
        const entities = [];
        const text = content.extractedText;
        // Extract corporations
        entities.push(...this.extractCorporations(text));
        // Extract LLCs
        entities.push(...this.extractLLCs(text));
        // Extract partnerships
        entities.push(...this.extractPartnerships(text));
        // Extract individuals
        entities.push(...this.extractIndividuals(text));
        // Extract government entities
        entities.push(...this.extractGovernmentEntities(text));
        // Enhance entities with jurisdiction information
        this.enhanceWithJurisdiction(entities, text);
        // Remove duplicates based on name and type
        return this.deduplicateEntities(entities);
    }
    extractCorporations(text) {
        const entities = [];
        const corporationPattern = /([A-Z][a-zA-Z\s&.]*?)\s+(Corporation|Company|Inc\.?|Corp\.?)\b/g;
        let match;
        while ((match = corporationPattern.exec(text)) !== null) {
            entities.push({
                name: `${match[1].trim()} ${match[2]}`,
                type: 'corporation',
                jurisdiction: 'unknown',
                location: {
                    start: match.index,
                    end: match.index + match[0].length,
                },
            });
        }
        return entities;
    }
    extractLLCs(text) {
        const entities = [];
        // More precise pattern that looks for entity names before LLC
        const llcPattern = /\b([A-Z][a-zA-Z]*(?:\s+[A-Z&][a-zA-Z]*){0,4})\s+(LLC|L\.L\.C\.?|Limited Liability Company)\b/g;
        let match;
        while ((match = llcPattern.exec(text)) !== null) {
            entities.push({
                name: `${match[1].trim()} ${match[2]}`,
                type: 'llc',
                jurisdiction: 'unknown',
                location: {
                    start: match.index,
                    end: match.index + match[0].length,
                },
            });
        }
        return entities;
    }
    extractPartnerships(text) {
        const entities = [];
        const partnershipPattern = /([A-Z][a-zA-Z\s&]+?)(?:\s+(?:LP|L\.P\.?|LLP|L\.L\.P\.?|Partnership|Partners))/g;
        let match;
        while ((match = partnershipPattern.exec(text)) !== null) {
            entities.push({
                name: match[0].trim(),
                type: 'partnership',
                jurisdiction: 'unknown',
                location: {
                    start: match.index,
                    end: match.index + match[0].length,
                },
            });
        }
        return entities;
    }
    extractIndividuals(text) {
        const entities = [];
        // Pattern for individual names (First Last or First Middle Last)
        const individualPattern = /(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?)?\s+[A-Z][a-z]+)(?!\s+(?:Inc\.?|Corp\.?|LLC|LP|LLP|Company|Corporation))/g;
        let match;
        while ((match = individualPattern.exec(text)) !== null) {
            // Avoid false positives by checking context
            if (this.isLikelyIndividualName(match[1], text, match.index)) {
                entities.push({
                    name: match[1].trim(),
                    type: 'individual',
                    jurisdiction: 'unknown',
                    location: {
                        start: match.index,
                        end: match.index + match[0].length,
                    },
                });
            }
        }
        return entities;
    }
    extractGovernmentEntities(text) {
        const entities = [];
        const governmentPattern = /(?:United States|U\.S\.|State of [A-Z][a-z]+|City of [A-Z][a-z]+|County of [A-Z][a-z]+|[A-Z][a-z]+\s+(?:Department|Agency|Bureau|Commission|Authority))/g;
        let match;
        while ((match = governmentPattern.exec(text)) !== null) {
            entities.push({
                name: match[0].trim(),
                type: 'government',
                jurisdiction: this.extractJurisdictionFromGovernmentEntity(match[0]),
                location: {
                    start: match.index,
                    end: match.index + match[0].length,
                },
            });
        }
        return entities;
    }
    enhanceWithJurisdiction(entities, text) {
        for (const entity of entities) {
            if (entity.jurisdiction === 'unknown') {
                entity.jurisdiction = this.detectJurisdiction(entity, text);
            }
            // Try to extract registration number
            entity.registrationNumber = this.extractRegistrationNumber(entity, text);
        }
    }
    detectJurisdiction(entity, text) {
        // Create a pattern to find jurisdiction information for this specific entity
        const entityName = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex chars
        // Look for patterns like "EntityName incorporated in State" or "EntityName organized under State law"
        const entityJurisdictionPattern = new RegExp(`${entityName}\\s+(?:incorporated in|organized under)\\s+([a-z\\s]+)(?:\\s+law)?`, 'i');
        const entityMatch = text.match(entityJurisdictionPattern);
        if (entityMatch) {
            return entityMatch[1].toLowerCase().trim();
        }
        // Look for jurisdiction information immediately after the entity
        const afterEntityText = text.substring(entity.location.end, Math.min(text.length, entity.location.end + 50));
        // Check for "organized under [state] law" pattern after the entity
        const organizedUnderMatch = afterEntityText.match(/\s+organized under\s+([a-z\s]+)\s+law/i);
        if (organizedUnderMatch) {
            return organizedUnderMatch[1].toLowerCase().trim();
        }
        // Check for "incorporated in [state]" pattern after the entity
        const incorporatedInMatch = afterEntityText.match(/\s+incorporated in\s+([a-z\s]+)/i);
        if (incorporatedInMatch) {
            return incorporatedInMatch[1].toLowerCase().trim();
        }
        // Check for explicit jurisdiction mentions in jurisdiction patterns
        const immediateContext = text.substring(Math.max(0, entity.location.start - 30), Math.min(text.length, entity.location.end + 30));
        for (const [jurisdiction, pattern] of this.jurisdictionPatterns) {
            if (pattern.test(immediateContext)) {
                return jurisdiction;
            }
        }
        return 'unknown';
    }
    extractRegistrationNumber(entity, text) {
        const entityText = text.substring(Math.max(0, entity.location.start - 100), Math.min(text.length, entity.location.end + 100));
        // Look for registration numbers, EINs, or other identifiers
        const registrationPatterns = [
            /(?:EIN|Tax ID|Federal ID):\s*(\d{2}-\d{7})/i,
            /(?:Registration|Reg\.?)\s*(?:No\.?|Number):\s*([A-Z0-9-]+)/i,
            /(?:Entity|Corp\.?|LLC)\s*(?:No\.?|Number|ID):\s*([A-Z0-9-]+)/i,
            /\(EIN:\s*([^)]+)\)/i,
            /\(Registration\s*No:\s*([^)]+)\)/i,
        ];
        for (const pattern of registrationPatterns) {
            const match = entityText.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        return undefined;
    }
    isLikelyIndividualName(name, text, position) {
        // Check if the name appears in a context that suggests it's an individual
        const contextBefore = text
            .substring(Math.max(0, position - 50), position)
            .toLowerCase();
        const contextAfter = text
            .substring(position, Math.min(text.length, position + 100))
            .toLowerCase();
        const individualIndicators = [
            'mr.',
            'mrs.',
            'ms.',
            'dr.',
            'individual',
            'person',
            'signatory',
            'witness',
            'party',
            'contractor',
            'employee',
            'director',
            'officer',
            'member',
        ];
        const corporateIndicators = [
            'inc',
            'corp',
            'llc',
            'company',
            'corporation',
            'limited',
            'partnership',
        ];
        // Check for corporate indicators first (negative signal)
        for (const indicator of corporateIndicators) {
            if (contextAfter.includes(indicator)) {
                return false;
            }
        }
        // Check for individual indicators
        for (const indicator of individualIndicators) {
            if (contextBefore.includes(indicator) ||
                contextAfter.includes(indicator)) {
                return true;
            }
        }
        // Check if it's followed by "the individual" or similar
        if (contextAfter.includes('the individual')) {
            return true;
        }
        // Default to false for ambiguous cases to avoid false positives
        // Only return true if name looks like a person's name AND has clear individual context
        const words = name.trim().split(/\s+/);
        const looksLikeName = words.length >= 2 &&
            words.length <= 3 &&
            words.every((word) => /^[A-Z][a-z]+$/.test(word));
        return (looksLikeName &&
            (contextBefore.includes('mr.') ||
                contextBefore.includes('mrs.') ||
                contextBefore.includes('ms.') ||
                contextBefore.includes('dr.') ||
                contextAfter.includes('individual')));
    }
    extractJurisdictionFromGovernmentEntity(entityName) {
        if (entityName.includes('United States') ||
            entityName.includes('U.S.')) {
            return 'federal';
        }
        const stateMatch = entityName.match(/State of ([A-Z][a-z]+)/);
        if (stateMatch) {
            return stateMatch[1].toLowerCase();
        }
        const cityMatch = entityName.match(/City of ([A-Z][a-z]+)/);
        if (cityMatch) {
            return `${cityMatch[1].toLowerCase()}-city`;
        }
        const countyMatch = entityName.match(/County of ([A-Z][a-z]+)/);
        if (countyMatch) {
            return `${countyMatch[1].toLowerCase()}-county`;
        }
        return 'government';
    }
    initializeEntityPatterns() {
        this.entityPatterns.set('corporation', /\b[A-Z][a-zA-Z\s&]+(?:Inc\.?|Corp\.?|Corporation|Company)\b/g);
        this.entityPatterns.set('llc', /\b[A-Z][a-zA-Z\s&]+(?:LLC|L\.L\.C\.?|Limited Liability Company)\b/g);
        this.entityPatterns.set('partnership', /\b[A-Z][a-zA-Z\s&]+(?:LP|L\.P\.?|LLP|L\.L\.P\.?|Partnership)\b/g);
        this.entityPatterns.set('individual', /(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?)?\s+[A-Z][a-z]+/g);
    }
    initializeJurisdictionPatterns() {
        this.jurisdictionPatterns.set('delaware', /(?:Delaware|DE|incorporated in Delaware|Delaware corporation)/i);
        this.jurisdictionPatterns.set('california', /(?:California|CA|incorporated in California|California corporation)/i);
        this.jurisdictionPatterns.set('new york', /(?:New York|NY|incorporated in New York|New York corporation)/i);
        this.jurisdictionPatterns.set('texas', /(?:Texas|TX|incorporated in Texas|Texas corporation)/i);
        this.jurisdictionPatterns.set('florida', /(?:Florida|FL|incorporated in Florida|Florida corporation)/i);
        this.jurisdictionPatterns.set('federal', /(?:United States|U\.S\.|federal|Federal)/i);
    }
    deduplicateEntities(entities) {
        const seen = new Set();
        const deduplicated = [];
        for (const entity of entities) {
            const key = `${entity.name.toLowerCase()}-${entity.type}`;
            if (!seen.has(key)) {
                seen.add(key);
                deduplicated.push(entity);
            }
        }
        return deduplicated;
    }
}
exports.LegalEntityRecognizer = LegalEntityRecognizer;
//# sourceMappingURL=LegalEntityRecognizer.js.map