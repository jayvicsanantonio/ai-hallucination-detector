import { ParsedContent, ExtractedEntity } from '../../../models/core';

export interface ExtractedMetadata {
  // Document properties
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  description?: string;
  language?: string;

  // Content statistics
  readabilityScore?: number;
  complexity?: 'low' | 'medium' | 'high';
  sentiment?: 'positive' | 'negative' | 'neutral';
  tone?: 'formal' | 'informal' | 'technical' | 'conversational';

  // Structural information
  hasHeaders?: boolean;
  hasTables?: boolean;
  hasFigures?: boolean;
  hasReferences?: boolean;
  hasLists?: boolean;

  // Content themes
  topics?: string[];
  categories?: string[];
  tags?: string[];

  // Quality metrics
  completeness?: number; // 0-1 score
  coherence?: number; // 0-1 score
  accuracy?: number; // 0-1 score (if verifiable)

  // Temporal information
  dateReferences?: string[];
  timeReferences?: string[];

  // Entity summaries
  entitySummary?: {
    people: string[];
    organizations: string[];
    locations: string[];
    amounts: string[];
    dates: string[];
  };
}

export interface MetadataExtractionOptions {
  extractTitle?: boolean;
  extractAuthor?: boolean;
  extractKeywords?: boolean;
  extractTopics?: boolean;
  calculateReadability?: boolean;
  analyzeSentiment?: boolean;
  analyzeTone?: boolean;
  extractEntities?: boolean;
  maxKeywords?: number;
  maxTopics?: number;
}

export class MetadataExtractor {
  /**
   * Extract comprehensive metadata from parsed content
   */
  extractMetadata(
    parsedContent: ParsedContent,
    options: MetadataExtractionOptions = {}
  ): ExtractedMetadata {
    const {
      extractTitle = true,
      extractAuthor = true,
      extractKeywords = true,
      extractTopics = true,
      calculateReadability = true,
      analyzeSentiment = false,
      analyzeTone = false,
      extractEntities = true,
      maxKeywords = 10,
      maxTopics = 5,
    } = options;

    const metadata: ExtractedMetadata = {};
    const text = parsedContent.extractedText;

    // Extract title
    if (extractTitle) {
      metadata.title = this.extractTitle(text, parsedContent);
    }

    // Extract author
    if (extractAuthor) {
      metadata.author = this.extractAuthor(text, parsedContent);
    }

    // Extract keywords
    if (extractKeywords) {
      metadata.keywords = this.extractKeywords(text, maxKeywords);
    }

    // Extract topics
    if (extractTopics) {
      metadata.topics = this.extractTopics(text, maxTopics);
    }

    // Calculate readability
    if (calculateReadability) {
      metadata.readabilityScore = this.calculateReadability(text);
      metadata.complexity = this.determineComplexity(
        metadata.readabilityScore
      );
    }

    // Analyze sentiment
    if (analyzeSentiment) {
      metadata.sentiment = this.analyzeSentiment(text);
    }

    // Analyze tone
    if (analyzeTone) {
      metadata.tone = this.analyzeTone(text);
    }

    // Extract structural information
    metadata.hasHeaders = parsedContent.structure.sections.length > 0;
    metadata.hasTables = parsedContent.structure.tables.length > 0;
    metadata.hasFigures = parsedContent.structure.figures.length > 0;
    metadata.hasReferences =
      parsedContent.structure.references.length > 0;
    metadata.hasLists = this.detectLists(text);

    // Extract entity summaries
    if (extractEntities) {
      metadata.entitySummary = this.summarizeEntities(
        parsedContent.entities
      );
    }

    // Extract temporal information
    metadata.dateReferences = this.extractDateReferences(text);
    metadata.timeReferences = this.extractTimeReferences(text);

    // Calculate quality metrics
    metadata.completeness = this.calculateCompleteness(parsedContent);
    metadata.coherence = this.calculateCoherence(text);

    // Detect language
    metadata.language = this.detectLanguage(text);

    // Extract categories and tags
    metadata.categories = this.extractCategories(text, parsedContent);
    metadata.tags = this.extractTags(text, parsedContent);

    return metadata;
  }

  /**
   * Extract title from content
   */
  private extractTitle(
    text: string,
    parsedContent: ParsedContent
  ): string | undefined {
    // Try to find title from structure first
    if (parsedContent.structure.sections.length > 0) {
      const firstSection = parsedContent.structure.sections[0];
      if (
        firstSection.level === 1 &&
        firstSection.title.length < 100
      ) {
        return firstSection.title.replace(/^#+\s*/, '').trim();
      }
    }

    // Look for title patterns in the first few lines
    const lines = text.split('\n').slice(0, 5);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 5 && trimmed.length < 100) {
        // Check if it looks like a title (no sentence-ending punctuation)
        if (!/[.!?]$/.test(trimmed) && /^[A-Z]/.test(trimmed)) {
          return trimmed;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract author from content
   */
  private extractAuthor(
    text: string,
    parsedContent: ParsedContent
  ): string | undefined {
    // Look for author patterns
    const authorPatterns = [
      /(?:by|author|written by)\s+([A-Z][a-z]+ [A-Z][a-z]+)/i,
      /^([A-Z][a-z]+ [A-Z][a-z]+)$/m,
    ];

    for (const pattern of authorPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Look for person entities that might be authors
    const personEntities = parsedContent.entities.filter(
      (e) => e.type === 'person'
    );
    if (personEntities.length > 0) {
      // Return the first person mentioned (likely the author)
      return personEntities[0].value;
    }

    return undefined;
  }

  /**
   * Extract keywords using frequency analysis
   */
  private extractKeywords(
    text: string,
    maxKeywords: number
  ): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3);

    // Common stop words
    const stopWords = new Set([
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'up',
      'about',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'among',
      'this',
      'that',
      'these',
      'those',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
      'shall',
      'should',
    ]);

    // Filter out stop words
    const filteredWords = words.filter(
      (word) => !stopWords.has(word)
    );

    // Count word frequency
    const wordFreq = new Map<string, number>();
    filteredWords.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Sort by frequency and return top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Extract topics using simple clustering
   */
  private extractTopics(text: string, maxTopics: number): string[] {
    const keywords = this.extractKeywords(text, 20);

    // Group related keywords into topics (simplified approach)
    const topics: string[] = [];
    const usedKeywords = new Set<string>();

    for (const keyword of keywords) {
      if (usedKeywords.has(keyword) || topics.length >= maxTopics)
        continue;

      // Find related keywords (simple co-occurrence)
      const relatedKeywords = keywords.filter(
        (k) =>
          !usedKeywords.has(k) && this.areRelated(keyword, k, text)
      );

      if (relatedKeywords.length > 0) {
        const topic = [keyword, ...relatedKeywords.slice(0, 2)].join(
          ', '
        );
        topics.push(topic);
        relatedKeywords.forEach((k) => usedKeywords.add(k));
        usedKeywords.add(keyword);
      }
    }

    return topics;
  }

  /**
   * Check if two keywords are related (appear near each other)
   */
  private areRelated(
    word1: string,
    word2: string,
    text: string
  ): boolean {
    const regex1 = new RegExp(`\\b${word1}\\b`, 'gi');
    const regex2 = new RegExp(`\\b${word2}\\b`, 'gi');

    const matches1 = Array.from(text.matchAll(regex1));
    const matches2 = Array.from(text.matchAll(regex2));

    // Check if they appear within 100 characters of each other
    for (const match1 of matches1) {
      for (const match2 of matches2) {
        if (Math.abs(match1.index! - match2.index!) < 100) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate readability score (simplified Flesch Reading Ease)
   */
  private calculateReadability(text: string): number {
    const sentences = text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const syllables = words.reduce(
      (count, word) => count + this.countSyllables(word),
      0
    );

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula
    const score =
      206.835 -
      1.015 * avgSentenceLength -
      84.6 * avgSyllablesPerWord;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    // Adjust for silent e
    if (word.endsWith('e')) count--;

    return Math.max(1, count);
  }

  /**
   * Determine complexity based on readability score
   */
  private determineComplexity(
    readabilityScore: number
  ): 'low' | 'medium' | 'high' {
    if (readabilityScore >= 70) return 'low';
    if (readabilityScore >= 30) return 'medium';
    return 'high';
  }

  /**
   * Analyze sentiment (simplified)
   */
  private analyzeSentiment(
    text: string
  ): 'positive' | 'negative' | 'neutral' {
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'wonderful',
      'fantastic',
      'positive',
      'success',
      'achieve',
      'benefit',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'horrible',
      'negative',
      'fail',
      'problem',
      'issue',
      'error',
      'wrong',
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach((word) => {
      if (positiveWords.some((pw) => word.includes(pw)))
        positiveCount++;
      if (negativeWords.some((nw) => word.includes(nw)))
        negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Analyze tone (simplified)
   */
  private analyzeTone(
    text: string
  ): 'formal' | 'informal' | 'technical' | 'conversational' {
    const formalIndicators = [
      'therefore',
      'furthermore',
      'consequently',
      'moreover',
      'nevertheless',
    ];
    const informalIndicators = [
      'gonna',
      'wanna',
      'yeah',
      'ok',
      'cool',
    ];
    const technicalIndicators = [
      'algorithm',
      'implementation',
      'methodology',
      'parameter',
      'configuration',
    ];
    const conversationalIndicators = [
      'you',
      'we',
      "let's",
      'how about',
      'what do you think',
    ];

    const words = text.toLowerCase();

    const formalScore = formalIndicators.reduce(
      (score, word) => score + (words.includes(word) ? 1 : 0),
      0
    );
    const informalScore = informalIndicators.reduce(
      (score, word) => score + (words.includes(word) ? 1 : 0),
      0
    );
    const technicalScore = technicalIndicators.reduce(
      (score, word) => score + (words.includes(word) ? 1 : 0),
      0
    );
    const conversationalScore = conversationalIndicators.reduce(
      (score, word) => score + (words.includes(word) ? 1 : 0),
      0
    );

    const maxScore = Math.max(
      formalScore,
      informalScore,
      technicalScore,
      conversationalScore
    );

    if (maxScore === technicalScore) return 'technical';
    if (maxScore === formalScore) return 'formal';
    if (maxScore === conversationalScore) return 'conversational';
    return 'informal';
  }

  /**
   * Detect lists in text
   */
  private detectLists(text: string): boolean {
    const listPatterns = [
      /^\s*[-*+]\s/m, // Bullet lists
      /^\s*\d+\.\s/m, // Numbered lists
      /^\s*[a-zA-Z]\.\s/m, // Lettered lists
    ];

    return listPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Summarize entities by type
   */
  private summarizeEntities(
    entities: ExtractedEntity[]
  ): ExtractedMetadata['entitySummary'] {
    const summary = {
      people: [] as string[],
      organizations: [] as string[],
      locations: [] as string[],
      amounts: [] as string[],
      dates: [] as string[],
    };

    entities.forEach((entity) => {
      switch (entity.type) {
        case 'person':
          if (!summary.people.includes(entity.value)) {
            summary.people.push(entity.value);
          }
          break;
        case 'organization':
          if (!summary.organizations.includes(entity.value)) {
            summary.organizations.push(entity.value);
          }
          break;
        case 'place':
          if (!summary.locations.includes(entity.value)) {
            summary.locations.push(entity.value);
          }
          break;
        case 'amount':
          if (!summary.amounts.includes(entity.value)) {
            summary.amounts.push(entity.value);
          }
          break;
        case 'date':
          if (!summary.dates.includes(entity.value)) {
            summary.dates.push(entity.value);
          }
          break;
      }
    });

    return summary;
  }

  /**
   * Extract date references
   */
  private extractDateReferences(text: string): string[] {
    const datePatterns = [
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
    ];

    const dates = new Set<string>();
    datePatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => dates.add(match));
      }
    });

    return Array.from(dates);
  }

  /**
   * Extract time references
   */
  private extractTimeReferences(text: string): string[] {
    const timePatterns = [
      /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g,
      /\b(?:morning|afternoon|evening|night|dawn|dusk|noon|midnight)\b/gi,
    ];

    const times = new Set<string>();
    timePatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => times.add(match));
      }
    });

    return Array.from(times);
  }

  /**
   * Calculate completeness score
   */
  private calculateCompleteness(
    parsedContent: ParsedContent
  ): number {
    let score = 0;

    // Check for basic structure
    if (parsedContent.extractedText.length > 100) score += 0.2;
    if (parsedContent.structure.sections.length > 0) score += 0.2;
    if (parsedContent.entities.length > 0) score += 0.2;

    // Check for rich content
    if (parsedContent.structure.tables.length > 0) score += 0.1;
    if (parsedContent.structure.figures.length > 0) score += 0.1;
    if (parsedContent.structure.references.length > 0) score += 0.2;

    return Math.min(1, score);
  }

  /**
   * Calculate coherence score (simplified)
   */
  private calculateCoherence(text: string): number {
    const sentences = text
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    if (sentences.length < 2) return 1;

    // Simple coherence based on sentence length variation and transition words
    const transitionWords = [
      'however',
      'therefore',
      'furthermore',
      'moreover',
      'consequently',
      'additionally',
      'meanwhile',
      'subsequently',
    ];
    let transitionCount = 0;

    transitionWords.forEach((word) => {
      if (text.toLowerCase().includes(word)) transitionCount++;
    });

    const transitionScore = Math.min(
      1,
      transitionCount / (sentences.length * 0.1)
    );

    // Check sentence length variation (good coherence has varied sentence lengths)
    const lengths = sentences.map(
      (s) => s.trim().split(/\s+/).length
    );
    const avgLength =
      lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance =
      lengths.reduce(
        (sum, len) => sum + Math.pow(len - avgLength, 2),
        0
      ) / lengths.length;
    const variationScore = Math.min(1, variance / 100);

    return (transitionScore + variationScore) / 2;
  }

  /**
   * Detect language (simplified)
   */
  private detectLanguage(text: string): string {
    // Very basic language detection based on common words
    const englishWords = [
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ];
    const words = text.toLowerCase().split(/\s+/);

    let englishCount = 0;
    words.forEach((word) => {
      if (englishWords.includes(word)) englishCount++;
    });

    const englishRatio = englishCount / Math.min(words.length, 100);

    if (englishRatio > 0.1) return 'en';
    return 'unknown';
  }

  /**
   * Extract categories based on content
   */
  private extractCategories(
    text: string,
    parsedContent: ParsedContent
  ): string[] {
    const categories: string[] = [];
    const lowerText = text.toLowerCase();

    // Business/Finance
    if (
      /\b(?:business|finance|money|profit|revenue|investment|market|economy)\b/.test(
        lowerText
      )
    ) {
      categories.push('business');
    }

    // Technology
    if (
      /\b(?:technology|software|computer|digital|internet|data|algorithm|programming)\b/.test(
        lowerText
      )
    ) {
      categories.push('technology');
    }

    // Healthcare
    if (
      /\b(?:health|medical|doctor|patient|treatment|medicine|hospital|disease)\b/.test(
        lowerText
      )
    ) {
      categories.push('healthcare');
    }

    // Legal
    if (
      /\b(?:legal|law|court|contract|agreement|regulation|compliance|attorney)\b/.test(
        lowerText
      )
    ) {
      categories.push('legal');
    }

    // Education
    if (
      /\b(?:education|school|university|student|teacher|learning|academic|research)\b/.test(
        lowerText
      )
    ) {
      categories.push('education');
    }

    return categories;
  }

  /**
   * Extract tags based on entities and keywords
   */
  private extractTags(
    text: string,
    parsedContent: ParsedContent
  ): string[] {
    const tags = new Set<string>();

    // Add entity values as tags
    parsedContent.entities.forEach((entity) => {
      if (
        entity.type === 'organization' ||
        entity.type === 'person'
      ) {
        tags.add(entity.value.toLowerCase());
      }
    });

    // Add keywords as tags
    const keywords = this.extractKeywords(text, 5);
    keywords.forEach((keyword) => tags.add(keyword));

    return Array.from(tags).slice(0, 10);
  }
}
