import { SourceType } from '../core/ContentTypes';
export interface Source {
    id: string;
    url?: string;
    title: string;
    author?: string;
    publishDate?: Date;
    credibilityScore: number;
    sourceType: SourceType;
    lastVerified?: Date;
    accessDate?: Date;
}
//# sourceMappingURL=Source.d.ts.map