import { Source } from './Source';

export interface FactualClaim {
  id: string;
  statement: string;
  confidence: number;
  sources: Source[];
  domain?: string;
  verified: boolean;
  createdAt: Date;
  lastVerified: Date;
  contradictions?: string[];
}
