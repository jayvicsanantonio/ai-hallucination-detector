"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContradictionDetector = void 0;
class ContradictionDetector {
    constructor() {
        this.negationWords = [
            'not',
            'no',
            'never',
            'none',
            'nothing',
            'nobody',
            'nowhere',
            'neither',
            'nor',
            'cannot',
            "can't",
            "won't",
            "wouldn't",
            "shouldn't",
            "couldn't",
            "mustn't",
            "isn't",
            "aren't",
            "wasn't",
            "weren't",
            "hasn't",
            "haven't",
            "hadn't",
            "doesn't",
            "don't",
            "didn't",
            'without',
            'unless',
        ];
        this.contradictoryPairs = [
            ['always', 'never'],
            ['all', 'none'],
            ['everyone', 'nobody'],
            ['everything', 'nothing'],
            ['everywhere', 'nowhere'],
            ['increase', 'decrease'],
            ['rise', 'fall'],
            ['up', 'down'],
            ['high', 'low'],
            ['more', 'less'],
            ['greater', 'smaller'],
            ['above', 'below'],
            ['before', 'after'],
            ['early', 'late'],
            ['first', 'last'],
            ['beginning', 'end'],
            ['start', 'stop'],
            ['open', 'close'],
            ['true', 'false'],
            ['correct', 'incorrect'],
            ['right', 'wrong'],
            ['good', 'bad'],
            ['positive', 'negative'],
            ['yes', 'no'],
            ['accept', 'reject'],
            ['approve', 'deny'],
        ];
    }
    async detectContradictions(content) {
        const contradictions = [];
        try {
            // Extract statements from the content
            const statements = this.extractStatements(content);
            // Check for direct contradictions
            const directContradictions = this.findDirectContradictions(statements);
            contradictions.push(...directContradictions);
            // Check for implicit contradictions
            const implicitContradictions = this.findImplicitContradictions(statements);
            contradictions.push(...implicitContradictions);
            // Check for temporal contradictions
            const temporalContradictions = this.findTemporalContradictions(statements);
            contradictions.push(...temporalContradictions);
            // Check for causal contradictions
            const causalContradictions = this.findCausalContradictions(statements);
            contradictions.push(...causalContradictions);
            return contradictions;
        }
        catch (error) {
            console.error('Error detecting contradictions:', error);
            return [];
        }
    }
    extractStatements(content) {
        const statements = [];
        const text = content.extractedText;
        if (!text) {
            return statements;
        }
        // Split text into sentences
        const sentences = text
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 0);
        let currentPosition = 0;
        sentences.forEach((sentence) => {
            const trimmedSentence = sentence.trim();
            if (trimmedSentence.length > 10) {
                // Filter out very short sentences
                const startPos = text.indexOf(trimmedSentence, currentPosition);
                const endPos = startPos + trimmedSentence.length;
                // Find relevant entities in this sentence
                const sentenceEntities = content.entities.filter((entity) => entity.location.start >= startPos &&
                    entity.location.end <= endPos);
                statements.push({
                    text: trimmedSentence,
                    location: {
                        start: startPos,
                        end: endPos,
                        line: this.getLineNumber(text, startPos),
                        column: this.getColumnNumber(text, startPos),
                    },
                    entities: sentenceEntities,
                    sentiment: this.analyzeSentiment(trimmedSentence),
                    ...this.parseStatement(trimmedSentence),
                });
                currentPosition = endPos;
            }
        });
        return statements;
    }
    findDirectContradictions(statements) {
        const contradictions = [];
        for (let i = 0; i < statements.length; i++) {
            for (let j = i + 1; j < statements.length; j++) {
                const stmt1 = statements[i];
                const stmt2 = statements[j];
                // Check for negation-based contradictions
                const negationContradiction = this.checkNegationContradiction(stmt1, stmt2);
                if (negationContradiction) {
                    contradictions.push(negationContradiction);
                }
                // Check for antonym-based contradictions
                const antonymContradiction = this.checkAntonymContradiction(stmt1, stmt2);
                if (antonymContradiction) {
                    contradictions.push(antonymContradiction);
                }
            }
        }
        return contradictions;
    }
    findImplicitContradictions(statements) {
        const contradictions = [];
        // Look for statements about the same subject with conflicting predicates
        const subjectGroups = this.groupStatementsBySubject(statements);
        Object.entries(subjectGroups).forEach(([subject, stmts]) => {
            if (stmts.length > 1) {
                for (let i = 0; i < stmts.length; i++) {
                    for (let j = i + 1; j < stmts.length; j++) {
                        const contradiction = this.checkImplicitContradiction(stmts[i], stmts[j]);
                        if (contradiction) {
                            contradictions.push(contradiction);
                        }
                    }
                }
            }
        });
        return contradictions;
    }
    findTemporalContradictions(statements) {
        const contradictions = [];
        // Find statements with temporal indicators
        const temporalStatements = statements.filter((stmt) => this.hasTemporalIndicators(stmt.text));
        for (let i = 0; i < temporalStatements.length; i++) {
            for (let j = i + 1; j < temporalStatements.length; j++) {
                const contradiction = this.checkTemporalContradiction(temporalStatements[i], temporalStatements[j]);
                if (contradiction) {
                    contradictions.push(contradiction);
                }
            }
        }
        return contradictions;
    }
    findCausalContradictions(statements) {
        const contradictions = [];
        // Find statements with causal indicators
        const causalStatements = statements.filter((stmt) => this.hasCausalIndicators(stmt.text));
        for (let i = 0; i < causalStatements.length; i++) {
            for (let j = i + 1; j < causalStatements.length; j++) {
                const contradiction = this.checkCausalContradiction(causalStatements[i], causalStatements[j]);
                if (contradiction) {
                    contradictions.push(contradiction);
                }
            }
        }
        return contradictions;
    }
    checkNegationContradiction(stmt1, stmt2) {
        const text1 = stmt1.text.toLowerCase();
        const text2 = stmt2.text.toLowerCase();
        // Remove negation words and compare
        const cleanText1 = this.removeNegations(text1);
        const cleanText2 = this.removeNegations(text2);
        const hasNegation1 = text1 !== cleanText1;
        const hasNegation2 = text2 !== cleanText2;
        // If one has negation and the other doesn't, and they're similar otherwise
        if (hasNegation1 !== hasNegation2) {
            const similarity = this.calculateTextSimilarity(cleanText1, cleanText2);
            if (similarity > 0.5) {
                // Lower threshold for better detection
                return {
                    id: `contradiction_${Date.now()}_${Math.random()}`,
                    statement1: stmt1.text,
                    statement2: stmt2.text,
                    location1: stmt1.location,
                    location2: stmt2.location,
                    type: 'direct',
                    severity: 'high',
                    explanation: 'Direct contradiction through negation',
                    confidence: Math.max(70, similarity * 100),
                };
            }
        }
        return null;
    }
    checkAntonymContradiction(stmt1, stmt2) {
        const text1 = stmt1.text.toLowerCase();
        const text2 = stmt2.text.toLowerCase();
        for (const [word1, word2] of this.contradictoryPairs) {
            if (text1.includes(word1) && text2.includes(word2)) {
                // Check if the context is similar (same subject)
                const contextSimilarity = this.calculateContextSimilarity(stmt1, stmt2);
                if (contextSimilarity > 0.3) {
                    // Lower threshold for better detection
                    return {
                        id: `contradiction_${Date.now()}_${Math.random()}`,
                        statement1: stmt1.text,
                        statement2: stmt2.text,
                        location1: stmt1.location,
                        location2: stmt2.location,
                        type: 'direct',
                        severity: 'medium',
                        explanation: `Contradictory terms: "${word1}" vs "${word2}"`,
                        confidence: Math.max(60, contextSimilarity * 100),
                    };
                }
            }
            // Also check reverse order
            if (text1.includes(word2) && text2.includes(word1)) {
                const contextSimilarity = this.calculateContextSimilarity(stmt1, stmt2);
                if (contextSimilarity > 0.3) {
                    return {
                        id: `contradiction_${Date.now()}_${Math.random()}`,
                        statement1: stmt1.text,
                        statement2: stmt2.text,
                        location1: stmt1.location,
                        location2: stmt2.location,
                        type: 'direct',
                        severity: 'medium',
                        explanation: `Contradictory terms: "${word2}" vs "${word1}"`,
                        confidence: Math.max(60, contextSimilarity * 100),
                    };
                }
            }
        }
        return null;
    }
    checkImplicitContradiction(stmt1, stmt2) {
        // Check if statements have the same subject but conflicting information
        if (stmt1.subject &&
            stmt2.subject &&
            stmt1.subject.toLowerCase() === stmt2.subject.toLowerCase()) {
            if (stmt1.sentiment &&
                stmt2.sentiment &&
                stmt1.sentiment !== stmt2.sentiment &&
                stmt1.sentiment !== 'neutral' &&
                stmt2.sentiment !== 'neutral') {
                return {
                    id: `contradiction_${Date.now()}_${Math.random()}`,
                    statement1: stmt1.text,
                    statement2: stmt2.text,
                    location1: stmt1.location,
                    location2: stmt2.location,
                    type: 'implicit',
                    severity: 'medium',
                    explanation: `Conflicting sentiments about ${stmt1.subject}`,
                    confidence: 75,
                };
            }
        }
        return null;
    }
    checkTemporalContradiction(stmt1, stmt2) {
        // Extract temporal information and check for conflicts
        const temporal1 = this.extractTemporalInfo(stmt1.text);
        const temporal2 = this.extractTemporalInfo(stmt2.text);
        if (temporal1 &&
            temporal2 &&
            this.areTemporallyInconsistent(temporal1, temporal2)) {
            return {
                id: `contradiction_${Date.now()}_${Math.random()}`,
                statement1: stmt1.text,
                statement2: stmt2.text,
                location1: stmt1.location,
                location2: stmt2.location,
                type: 'temporal',
                severity: 'medium',
                explanation: 'Temporal inconsistency detected',
                confidence: 70,
            };
        }
        return null;
    }
    checkCausalContradiction(stmt1, stmt2) {
        // Extract causal relationships and check for conflicts
        const causal1 = this.extractCausalInfo(stmt1.text);
        const causal2 = this.extractCausalInfo(stmt2.text);
        if (causal1 &&
            causal2 &&
            this.areCausallyInconsistent(causal1, causal2)) {
            return {
                id: `contradiction_${Date.now()}_${Math.random()}`,
                statement1: stmt1.text,
                statement2: stmt2.text,
                location1: stmt1.location,
                location2: stmt2.location,
                type: 'causal',
                severity: 'medium',
                explanation: 'Causal inconsistency detected',
                confidence: 65,
            };
        }
        return null;
    }
    // Helper methods
    analyzeSentiment(text) {
        const positiveWords = [
            'good',
            'great',
            'excellent',
            'positive',
            'success',
            'increase',
            'improve',
        ];
        const negativeWords = [
            'bad',
            'terrible',
            'negative',
            'failure',
            'decrease',
            'decline',
            'worse',
        ];
        const lowerText = text.toLowerCase();
        const positiveCount = positiveWords.filter((word) => lowerText.includes(word)).length;
        const negativeCount = negativeWords.filter((word) => lowerText.includes(word)).length;
        if (positiveCount > negativeCount)
            return 'positive';
        if (negativeCount > positiveCount)
            return 'negative';
        return 'neutral';
    }
    parseStatement(text) {
        // Simple subject-predicate-object extraction
        const words = text.toLowerCase().split(/\s+/);
        // This is a simplified implementation - in production, you'd use NLP libraries
        return {
            subject: words[0],
            predicate: words[1],
            object: words.length > 2 ? words.slice(2).join(' ') : undefined,
        };
    }
    groupStatementsBySubject(statements) {
        const groups = {};
        statements.forEach((stmt) => {
            if (stmt.subject) {
                const key = stmt.subject.toLowerCase();
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(stmt);
            }
        });
        return groups;
    }
    removeNegations(text) {
        let cleanText = text;
        this.negationWords.forEach((negation) => {
            cleanText = cleanText.replace(new RegExp(`\\b${negation}\\b`, 'gi'), '');
        });
        return cleanText.replace(/\s+/g, ' ').trim();
    }
    calculateTextSimilarity(text1, text2) {
        const words1 = new Set(text1.split(/\s+/));
        const words2 = new Set(text2.split(/\s+/));
        const intersection = new Set([...words1].filter((x) => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }
    calculateContextSimilarity(stmt1, stmt2) {
        // Compare entities and subjects
        let similarity = 0;
        if (stmt1.subject && stmt2.subject) {
            similarity +=
                stmt1.subject.toLowerCase() === stmt2.subject.toLowerCase()
                    ? 0.5
                    : 0;
        }
        // Compare entities
        const entities1 = new Set(stmt1.entities.map((e) => e.value.toLowerCase()));
        const entities2 = new Set(stmt2.entities.map((e) => e.value.toLowerCase()));
        if (entities1.size > 0 && entities2.size > 0) {
            const commonEntities = new Set([...entities1].filter((x) => entities2.has(x)));
            similarity +=
                (commonEntities.size /
                    Math.max(entities1.size, entities2.size)) *
                    0.5;
        }
        // Add basic text similarity for better detection
        const words1 = new Set(stmt1.text.toLowerCase().split(/\s+/));
        const words2 = new Set(stmt2.text.toLowerCase().split(/\s+/));
        const commonWords = new Set([...words1].filter((x) => words2.has(x)));
        const textSimilarity = commonWords.size / Math.max(words1.size, words2.size);
        similarity += textSimilarity * 0.3;
        return Math.min(1, similarity);
    }
    hasTemporalIndicators(text) {
        const temporalWords = [
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
        ];
        const lowerText = text.toLowerCase();
        return temporalWords.some((word) => lowerText.includes(word));
    }
    hasCausalIndicators(text) {
        const causalWords = [
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
        ];
        const lowerText = text.toLowerCase();
        return causalWords.some((word) => lowerText.includes(word));
    }
    extractTemporalInfo(text) {
        // Simplified temporal extraction - would use NLP in production
        const temporalPattern = /(before|after|during|while|when|then|first|last|earlier|later)/gi;
        const matches = text.match(temporalPattern);
        return matches ? { indicators: matches } : null;
    }
    extractCausalInfo(text) {
        // Simplified causal extraction - would use NLP in production
        const causalPattern = /(because|since|due to|caused by|results in|leads to|therefore|thus)/gi;
        const matches = text.match(causalPattern);
        return matches ? { indicators: matches } : null;
    }
    areTemporallyInconsistent(temporal1, temporal2) {
        // Simplified temporal consistency check
        return false; // Placeholder - would implement proper temporal logic
    }
    areCausallyInconsistent(causal1, causal2) {
        // Simplified causal consistency check
        return false; // Placeholder - would implement proper causal logic
    }
    getLineNumber(text, position) {
        return text.substring(0, position).split('\n').length;
    }
    getColumnNumber(text, position) {
        const lines = text.substring(0, position).split('\n');
        return lines[lines.length - 1].length + 1;
    }
}
exports.ContradictionDetector = ContradictionDetector;
//# sourceMappingURL=ContradictionDetector.js.map