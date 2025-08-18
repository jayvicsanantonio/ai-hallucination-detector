import { ContentType, EntityType } from './ContentTypes';
import { DocumentStructure, TextLocation } from './TextLocation';

export interface ParsedContent {
  id: string;
  originalContent: string;
  extractedText: string;
  contentType: ContentType;
  structure: DocumentStructure;
  entities: ExtractedEntity[];
  metadata: ContentMetadata;
  createdAt: Date;
}

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  location: TextLocation;
  context: string;
}

export interface ContentMetadata {
  filename?: string;
  fileSize?: number;
  author?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  language?: string;
  encoding?: string;
  pageCount?: number;
  wordCount?: number;
  customFields?: Record<string, any>;
}
