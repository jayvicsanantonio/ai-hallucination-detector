import { SourceType } from '../core/ContentTypes';

export interface Source {
  id: string;
  url?: string;
  title: string;
  author?: string;
  publishDate?: Date;
  credibilityScore: number; // 0-100
  sourceType: SourceType;
  lastVerified?: Date;
  accessDate?: Date;
}
