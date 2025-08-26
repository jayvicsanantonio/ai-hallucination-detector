"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogicalFallacyDetector = void 0;
class LogicalFallacyDetector {
    constructor() {
        this.fallacyPatterns = [
            {
                name: 'Ad Hominem',
                description: 'Attacking the person making the argument rather than the argument itself',
                patterns: [
                    /\b(you are|he is|she is|they are)\s+(stupid|wrong|biased|incompetent|unqualified)/gi,
                    /\b(coming from someone who|typical of|what do you expect from)/gi,
                ],
                keywords: [
                    'stupid',
                    'incompetent',
                    'biased',
                    'unqualified',
                    'typical',
                ],
                severity: 'medium',
                explanation: 'Focus on addressing the argument rather than personal characteristics',
                examples: [
                    "You're wrong because you're biased",
                    'Coming from someone who failed before',
                ],
            },
            {
                name: 'Straw Man',
                description: "Misrepresenting someone's argument to make it easier to attack",
                patterns: [
                    /\b(so you\'re saying|what you really mean|in other words)/gi,
                    /\b(you want to|you think|you believe)\s+.*(destroy|eliminate|get rid of)/gi,
                ],
                keywords: [
                    "so you're saying",
                    'what you really mean',
                    'in other words',
                ],
                severity: 'medium',
                explanation: 'Address the actual argument being made, not a distorted version',
                examples: [
                    "So you're saying we should eliminate all regulations",
                ],
            },
            {
                name: 'False Dichotomy',
                description: 'Presenting only two options when more exist',
                patterns: [
                    /\b(either|only two|you must choose|it\'s either)\s+.*(or|otherwise)/gi,
                    /\b(there are only|the only options are|you can either)/gi,
                ],
                keywords: ['either', 'only two', 'must choose', 'only options'],
                severity: 'medium',
                explanation: 'Consider additional alternatives beyond the two presented',
                examples: [
                    "You're either with us or against us",
                    'There are only two solutions',
                ],
            },
            {
                name: 'Appeal to Authority',
                description: 'Claiming something is true because an authority figure says so',
                patterns: [
                    /\b(according to|as stated by|expert says|authority confirms)/gi,
                    /\b(because.*said so|trust.*expert|authority on)/gi,
                ],
                keywords: [
                    'expert says',
                    'authority confirms',
                    'according to',
                    'trust expert',
                ],
                severity: 'low',
                explanation: 'Evaluate the evidence and reasoning, not just the source',
                examples: ['It must be true because the CEO said so'],
            },
            {
                name: 'Slippery Slope',
                description: 'Arguing that one event will lead to a chain of negative consequences',
                patterns: [
                    /\b(if we allow|this will lead to|next thing you know|before you know it)/gi,
                    /\b(slippery slope|domino effect|chain reaction|inevitable result)/gi,
                ],
                keywords: [
                    'will lead to',
                    'next thing',
                    'slippery slope',
                    'domino effect',
                ],
                severity: 'medium',
                explanation: 'Provide evidence for each step in the proposed chain of events',
                examples: [
                    'If we allow this, next thing you know everything will collapse',
                ],
            },
            {
                name: 'Circular Reasoning',
                description: 'Using the conclusion as evidence for the premise',
                patterns: [
                    /\b(because it is|it\'s true because|the reason is that it)/gi,
                    /\b(obviously|clearly|it\'s evident that).*\b(because|since|due to)/gi,
                ],
                keywords: ['because it is', 'obviously', 'clearly', 'evident'],
                severity: 'high',
                explanation: 'Provide independent evidence rather than restating the conclusion',
                examples: ["It's the best because it's better than the rest"],
            },
            {
                name: 'Hasty Generalization',
                description: 'Drawing broad conclusions from limited examples',
                patterns: [
                    /\b(all|every|always|never|everyone|no one)\s+.*(because|since|due to)/gi,
                    /\b(this proves that all|therefore everyone|this shows that every)/gi,
                ],
                keywords: [
                    'all',
                    'every',
                    'always',
                    'never',
                    'everyone',
                    'proves that all',
                ],
                severity: 'medium',
                explanation: 'Ensure sufficient sample size before making generalizations',
                examples: [
                    'All politicians are corrupt because I met one who was',
                ],
            },
            {
                name: 'Appeal to Emotion',
                description: 'Using emotional manipulation instead of logical reasoning',
                patterns: [
                    /\b(think of the children|for the sake of|imagine if|how would you feel)/gi,
                    /\b(heartbreaking|devastating|tragic|wonderful|amazing)\s+.*(therefore|so|thus)/gi,
                ],
                keywords: [
                    'think of the children',
                    'heartbreaking',
                    'devastating',
                    'imagine if',
                ],
                severity: 'medium',
                explanation: 'Focus on logical arguments rather than emotional appeals',
                examples: [
                    'We must do this for the children',
                    'This devastating situation proves we need change',
                ],
            },
            {
                name: 'Red Herring',
                description: 'Introducing irrelevant information to distract from the main issue',
                patterns: [
                    /\b(but what about|speaking of|that reminds me|by the way)/gi,
                    /\b(more importantly|the real issue|what we should focus on)/gi,
                ],
                keywords: [
                    'but what about',
                    'real issue',
                    'more importantly',
                    'speaking of',
                ],
                severity: 'low',
                explanation: 'Stay focused on the original topic and argument',
                examples: ['But what about the other problems we have?'],
            },
            {
                name: 'Bandwagon Fallacy',
                description: 'Arguing something is correct because many people believe it',
                patterns: [
                    /\b(everyone knows|most people|majority believes|popular opinion)/gi,
                    /\b(everyone is doing|most agree|widely accepted|common knowledge)/gi,
                ],
                keywords: [
                    'everyone knows',
                    'most people',
                    'majority believes',
                    'everyone is doing',
                ],
                severity: 'low',
                explanation: 'Evaluate the evidence rather than relying on popularity',
                examples: ['Everyone knows this is the right way to do it'],
            },
        ];
    }
    async detectFallacies(content) {
        const fallacies = [];
        try {
            const text = content.extractedText;
            if (!text) {
                return fallacies;
            }
            const sentences = this.extractSentences(text);
            for (const sentence of sentences) {
                for (const pattern of this.fallacyPatterns) {
                    const detectedFallacy = this.checkForFallacy(sentence, pattern, text);
                    if (detectedFallacy) {
                        fallacies.push(detectedFallacy);
                    }
                }
            }
            // Remove duplicates and overlapping fallacies
            return this.deduplicateFallacies(fallacies);
        }
        catch (error) {
            console.error('Error detecting logical fallacies:', error);
            return [];
        }
    }
    extractSentences(text) {
        const sentences = [];
        const sentenceRegex = /[.!?]+/g;
        let lastIndex = 0;
        let match;
        while ((match = sentenceRegex.exec(text)) !== null) {
            const sentenceText = text
                .substring(lastIndex, match.index + match[0].length)
                .trim();
            if (sentenceText.length > 10) {
                // Filter out very short sentences
                sentences.push({
                    text: sentenceText,
                    start: lastIndex,
                    end: match.index + match[0].length,
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
                    start: lastIndex,
                    end: text.length,
                });
            }
        }
        return sentences;
    }
    checkForFallacy(sentence, pattern, fullText) {
        const text = sentence.text.toLowerCase();
        // Check regex patterns
        for (const regex of pattern.patterns) {
            if (regex.test(text)) {
                return this.createFallacy(sentence, pattern, fullText, 'pattern');
            }
        }
        // Check keyword combinations
        const keywordMatches = pattern.keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
        if (keywordMatches.length > 0) {
            // Require at least 2 keywords for keyword-based detection to reduce false positives
            if (keywordMatches.length >= 2 ||
                pattern.keywords.length === 1) {
                return this.createFallacy(sentence, pattern, fullText, 'keyword');
            }
        }
        return null;
    }
    createFallacy(sentence, pattern, fullText, detectionMethod) {
        const confidence = this.calculateConfidence(sentence.text, pattern, detectionMethod);
        return {
            id: `fallacy_${Date.now()}_${Math.random()}`,
            type: pattern.name,
            description: pattern.description,
            location: {
                start: sentence.start,
                end: sentence.end,
                line: this.getLineNumber(fullText, sentence.start),
                column: this.getColumnNumber(fullText, sentence.start),
            },
            severity: pattern.severity,
            explanation: pattern.explanation,
            examples: pattern.examples,
            confidence,
        };
    }
    calculateConfidence(text, pattern, detectionMethod) {
        let baseConfidence = detectionMethod === 'pattern' ? 80 : 60;
        // Adjust confidence based on text length and context
        const textLength = text.length;
        if (textLength < 50) {
            baseConfidence -= 10; // Lower confidence for very short text
        }
        else if (textLength > 200) {
            baseConfidence += 5; // Slightly higher confidence for longer, more contextual text
        }
        // Adjust based on keyword density
        const keywordCount = pattern.keywords.filter((keyword) => text.toLowerCase().includes(keyword.toLowerCase())).length;
        if (keywordCount > 1) {
            baseConfidence += keywordCount * 5;
        }
        // Adjust based on fallacy severity (more severe fallacies need higher confidence)
        switch (pattern.severity) {
            case 'critical':
                baseConfidence += 10;
                break;
            case 'high':
                baseConfidence += 5;
                break;
            case 'low':
                baseConfidence -= 5;
                break;
        }
        return Math.min(95, Math.max(30, baseConfidence));
    }
    deduplicateFallacies(fallacies) {
        const deduplicated = [];
        for (const fallacy of fallacies) {
            const isDuplicate = deduplicated.some((existing) => existing.type === fallacy.type &&
                Math.abs(existing.location.start - fallacy.location.start) <
                    50 // Within 50 characters
            );
            if (!isDuplicate) {
                deduplicated.push(fallacy);
            }
            else {
                // If it's a duplicate, keep the one with higher confidence
                const existingIndex = deduplicated.findIndex((existing) => existing.type === fallacy.type &&
                    Math.abs(existing.location.start - fallacy.location.start) < 50);
                if (existingIndex !== -1 &&
                    fallacy.confidence > deduplicated[existingIndex].confidence) {
                    deduplicated[existingIndex] = fallacy;
                }
            }
        }
        return deduplicated.sort((a, b) => a.location.start - b.location.start);
    }
    getLineNumber(text, position) {
        return text.substring(0, position).split('\n').length;
    }
    getColumnNumber(text, position) {
        const lines = text.substring(0, position).split('\n');
        return lines[lines.length - 1].length + 1;
    }
    // Method to add custom fallacy patterns
    addCustomFallacyPattern(pattern) {
        this.fallacyPatterns.push(pattern);
    }
    // Method to get all available fallacy types
    getAvailableFallacyTypes() {
        return this.fallacyPatterns.map((pattern) => pattern.name);
    }
    // Method to get pattern details for a specific fallacy type
    getFallacyPattern(fallacyType) {
        return this.fallacyPatterns.find((pattern) => pattern.name === fallacyType);
    }
}
exports.LogicalFallacyDetector = LogicalFallacyDetector;
//# sourceMappingURL=LogicalFallacyDetector.js.map