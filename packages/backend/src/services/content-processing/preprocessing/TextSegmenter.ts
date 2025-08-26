import { ParsedContent, TextLocation } from '../../../models/core';

export interface SegmentationOptions {
  segmentBySentences?: boolean;
  segmentByParagraphs?: boolean;
  segmentBySemanticBlocks?: boolean;
  maxSegmentLength?: number;
  minSegmentLength?: number;
  overlapLength?: number;
  preserveStructure?: boolean;
}

export interface TextSegment {
  id: string;
  text: string;
  type: 'sentence' | 'paragraph' | 'semantic_block' | 'chunk';
  location: TextLocation;
  metadata: {
    wordCount: number;
    characterCount: number;
    index: number;
    parentSegment?: string;
  };
}

export interface SegmentationResult {
  segments: TextSegment[];
  totalSegments: number;
  averageLength: number;
  statistics: {
    sentences: number;
    paragraphs: number;
    semanticBlocks: number;
    chunks: number;
  };
}

export class TextSegmenter {
  /**
   * Segment text based on provided options
   */
  segment(
    content: string,
    options: SegmentationOptions = {}
  ): SegmentationResult {
    const {
      segmentBySentences = false,
      segmentByParagraphs = true,
      segmentBySemanticBlocks = false,
      maxSegmentLength = 1000,
      minSegmentLength = 50,
      overlapLength = 0,
      preserveStructure = true,
    } = options;

    const segments: TextSegment[] = [];
    let segmentIndex = 0;

    if (segmentBySentences) {
      const sentences = this.extractSentences(content);
      sentences.forEach((sentence, index) => {
        if (sentence.text.length >= minSegmentLength) {
          segments.push({
            id: `sentence_${segmentIndex++}`,
            text: sentence.text,
            type: 'sentence',
            location: sentence.location,
            metadata: {
              wordCount: this.countWords(sentence.text),
              characterCount: sentence.text.length,
              index,
            },
          });
        }
      });
    }

    if (segmentByParagraphs) {
      const paragraphs = this.extractParagraphs(content);
      paragraphs.forEach((paragraph, index) => {
        if (paragraph.text.length >= minSegmentLength) {
          segments.push({
            id: `paragraph_${segmentIndex++}`,
            text: paragraph.text,
            type: 'paragraph',
            location: paragraph.location,
            metadata: {
              wordCount: this.countWords(paragraph.text),
              characterCount: paragraph.text.length,
              index,
            },
          });
        }
      });
    }

    if (segmentBySemanticBlocks) {
      const semanticBlocks = this.extractSemanticBlocks(content);
      semanticBlocks.forEach((block, index) => {
        if (block.text.length >= minSegmentLength) {
          segments.push({
            id: `semantic_${segmentIndex++}`,
            text: block.text,
            type: 'semantic_block',
            location: block.location,
            metadata: {
              wordCount: this.countWords(block.text),
              characterCount: block.text.length,
              index,
            },
          });
        }
      });
    }

    // If no specific segmentation is requested or segments are too long, create chunks
    if (
      segments.length === 0 ||
      segments.some((s) => s.text.length > maxSegmentLength)
    ) {
      const chunks = this.createChunks(
        content,
        maxSegmentLength,
        minSegmentLength,
        overlapLength
      );
      chunks.forEach((chunk, index) => {
        segments.push({
          id: `chunk_${segmentIndex++}`,
          text: chunk.text,
          type: 'chunk',
          location: chunk.location,
          metadata: {
            wordCount: this.countWords(chunk.text),
            characterCount: chunk.text.length,
            index,
          },
        });
      });
    }

    // Calculate statistics
    const statistics = {
      sentences: segments.filter((s) => s.type === 'sentence').length,
      paragraphs: segments.filter((s) => s.type === 'paragraph')
        .length,
      semanticBlocks: segments.filter(
        (s) => s.type === 'semantic_block'
      ).length,
      chunks: segments.filter((s) => s.type === 'chunk').length,
    };

    const totalLength = segments.reduce(
      (sum, s) => sum + s.text.length,
      0
    );
    const averageLength =
      segments.length > 0 ? totalLength / segments.length : 0;

    return {
      segments,
      totalSegments: segments.length,
      averageLength,
      statistics,
    };
  }

  /**
   * Extract sentences from text
   */
  private extractSentences(
    content: string
  ): Array<{ text: string; location: TextLocation }> {
    const sentences: Array<{ text: string; location: TextLocation }> =
      [];

    // Split by sentence-ending punctuation, but be careful with abbreviations
    const sentenceRegex = /[.!?]+\s+/g;
    let lastIndex = 0;
    let match;

    while ((match = sentenceRegex.exec(content)) !== null) {
      const sentenceText = content
        .substring(lastIndex, match.index + match[0].length)
        .trim();

      if (sentenceText.length > 0) {
        sentences.push({
          text: sentenceText,
          location: {
            start: lastIndex,
            end: match.index + match[0].length,
            line: this.getLineNumber(content, lastIndex),
          },
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add the last sentence if there's remaining content
    if (lastIndex < content.length) {
      const lastSentence = content.substring(lastIndex).trim();
      if (lastSentence.length > 0) {
        sentences.push({
          text: lastSentence,
          location: {
            start: lastIndex,
            end: content.length,
            line: this.getLineNumber(content, lastIndex),
          },
        });
      }
    }

    return sentences;
  }

  /**
   * Extract paragraphs from text
   */
  private extractParagraphs(
    content: string
  ): Array<{ text: string; location: TextLocation }> {
    const paragraphs: Array<{
      text: string;
      location: TextLocation;
    }> = [];
    const paragraphTexts = content.split(/\n\s*\n/);
    let currentIndex = 0;

    paragraphTexts.forEach((paragraphText) => {
      const trimmed = paragraphText.trim();
      if (trimmed.length > 0) {
        const startIndex = content.indexOf(trimmed, currentIndex);
        const endIndex = startIndex + trimmed.length;

        paragraphs.push({
          text: trimmed,
          location: {
            start: startIndex,
            end: endIndex,
            line: this.getLineNumber(content, startIndex),
          },
        });

        currentIndex = endIndex;
      }
    });

    return paragraphs;
  }

  /**
   * Extract semantic blocks (sections, lists, etc.)
   */
  private extractSemanticBlocks(
    content: string
  ): Array<{ text: string; location: TextLocation }> {
    const blocks: Array<{ text: string; location: TextLocation }> =
      [];
    const lines = content.split('\n');
    let currentBlock = '';
    let blockStart = 0;
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = currentIndex;
      currentIndex += line.length + 1; // +1 for newline

      // Detect block boundaries (headers, lists, empty lines)
      const isHeader =
        /^#{1,6}\s/.test(line) ||
        /^[A-Z][^.!?]*:?\s*$/.test(line.trim());
      const isList =
        /^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line);
      const isEmpty = line.trim().length === 0;

      if (isHeader || (isEmpty && currentBlock.trim().length > 0)) {
        // End current block
        if (currentBlock.trim().length > 0) {
          blocks.push({
            text: currentBlock.trim(),
            location: {
              start: blockStart,
              end: lineStart,
              line: this.getLineNumber(content, blockStart),
            },
          });
        }

        // Start new block
        if (isHeader) {
          currentBlock = line;
          blockStart = lineStart;
        } else {
          currentBlock = '';
          blockStart = currentIndex;
        }
      } else if (!isEmpty) {
        if (currentBlock.length === 0) {
          blockStart = lineStart;
        }
        currentBlock += (currentBlock.length > 0 ? '\n' : '') + line;
      }
    }

    // Add the last block
    if (currentBlock.trim().length > 0) {
      blocks.push({
        text: currentBlock.trim(),
        location: {
          start: blockStart,
          end: content.length,
          line: this.getLineNumber(content, blockStart),
        },
      });
    }

    return blocks;
  }

  /**
   * Create fixed-size chunks with optional overlap
   */
  private createChunks(
    content: string,
    maxLength: number,
    minLength: number,
    overlapLength: number
  ): Array<{ text: string; location: TextLocation }> {
    const chunks: Array<{ text: string; location: TextLocation }> =
      [];
    const words = content.split(/\s+/);
    let currentChunk = '';
    let chunkStart = 0;
    let wordIndex = 0;

    while (wordIndex < words.length) {
      const word = words[wordIndex];
      const testChunk =
        currentChunk + (currentChunk ? ' ' : '') + word;

      if (testChunk.length <= maxLength) {
        currentChunk = testChunk;
        wordIndex++;
      } else {
        // Current chunk is full, save it if it meets minimum length
        if (currentChunk.length >= minLength) {
          const chunkEnd = chunkStart + currentChunk.length;
          chunks.push({
            text: currentChunk,
            location: {
              start: chunkStart,
              end: chunkEnd,
              line: this.getLineNumber(content, chunkStart),
            },
          });

          // Calculate overlap for next chunk
          if (overlapLength > 0) {
            const overlapWords = currentChunk
              .split(/\s+/)
              .slice(-Math.ceil(overlapLength / 10));
            currentChunk = overlapWords.join(' ');
            chunkStart = chunkEnd - currentChunk.length;
          } else {
            currentChunk = '';
            chunkStart = chunkEnd;
          }
        } else {
          // Current chunk is too small, add the word anyway
          currentChunk = testChunk;
          wordIndex++;
        }
      }
    }

    // Add the last chunk
    if (currentChunk.length >= minLength) {
      chunks.push({
        text: currentChunk,
        location: {
          start: chunkStart,
          end: chunkStart + currentChunk.length,
          line: this.getLineNumber(content, chunkStart),
        },
      });
    }

    return chunks;
  }

  /**
   * Segment parsed content and update the content object
   */
  segmentParsedContent(
    parsedContent: ParsedContent,
    options: SegmentationOptions = {}
  ): ParsedContent & { segmentation: SegmentationResult } {
    const segmentationResult = this.segment(
      parsedContent.extractedText,
      options
    );

    return {
      ...parsedContent,
      segmentation: segmentationResult,
      metadata: {
        ...parsedContent.metadata,
        segmentation: {
          applied: true,
          options,
          totalSegments: segmentationResult.totalSegments,
          averageLength: segmentationResult.averageLength,
          statistics: segmentationResult.statistics,
          segmentedAt: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Get optimal segmentation for content length
   */
  getOptimalSegmentation(contentLength: number): SegmentationOptions {
    if (contentLength < 500) {
      return {
        segmentBySentences: true,
        maxSegmentLength: 200,
        minSegmentLength: 20,
      };
    } else if (contentLength < 2000) {
      return {
        segmentByParagraphs: true,
        maxSegmentLength: 500,
        minSegmentLength: 50,
      };
    } else if (contentLength < 10000) {
      return {
        segmentBySemanticBlocks: true,
        maxSegmentLength: 1000,
        minSegmentLength: 100,
        overlapLength: 50,
      };
    } else {
      return {
        segmentBySemanticBlocks: true,
        maxSegmentLength: 2000,
        minSegmentLength: 200,
        overlapLength: 100,
      };
    }
  }

  /**
   * Merge small segments with adjacent ones
   */
  mergeSmallSegments(
    segments: TextSegment[],
    minLength: number
  ): TextSegment[] {
    const merged: TextSegment[] = [];
    let currentSegment: TextSegment | null = null;

    for (const segment of segments) {
      if (segment.text.length < minLength && currentSegment) {
        // Merge with previous segment
        currentSegment.text += ' ' + segment.text;
        currentSegment.location.end = segment.location.end;
        currentSegment.metadata.wordCount +=
          segment.metadata.wordCount;
        currentSegment.metadata.characterCount +=
          segment.metadata.characterCount;
      } else {
        if (currentSegment) {
          merged.push(currentSegment);
        }
        currentSegment = { ...segment };
      }
    }

    if (currentSegment) {
      merged.push(currentSegment);
    }

    return merged;
  }

  /**
   * Helper methods
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  private getLineNumber(text: string, position: number): number {
    return text.substring(0, position).split('\n').length;
  }
}
