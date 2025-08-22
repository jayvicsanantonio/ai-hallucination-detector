import { Domain } from '../core/ContentTypes';
import { Source } from './Source';
export interface FactualClaim {
    id: string;
    statement: string;
    sources: Source[];
    confidence: number;
    domain: Domain;
    lastVerified: Date;
    contradictions?: string[];
    tags?: string[];
    verificationMethod?: string;
}
//# sourceMappingURL=FactualClaim.d.ts.map