import { SourceType } from '../core/ContentTypes';

export interface Source {
  id: string;
  name: string;
  title?: string;
  url?: string;
  credibilityScore: number;
  type: SourceType;
  sourceType?: SourceType;
  lastUpdated: Date;
  lastVerified?: Date;
  publishDate?: Date;
  author?: string;
}
