import { ParsedContent } from '@/models/core/ParsedContent';
import { LegalEntity } from './LegalModule';
export declare class LegalEntityRecognizer {
    private entityPatterns;
    private jurisdictionPatterns;
    constructor();
    extractLegalEntities(content: ParsedContent): Promise<LegalEntity[]>;
    private extractCorporations;
    private extractLLCs;
    private extractPartnerships;
    private extractIndividuals;
    private extractGovernmentEntities;
    private enhanceWithJurisdiction;
    private detectJurisdiction;
    private extractRegistrationNumber;
    private isLikelyIndividualName;
    private extractJurisdictionFromGovernmentEntity;
    private initializeEntityPatterns;
    private initializeJurisdictionPatterns;
    private deduplicateEntities;
}
//# sourceMappingURL=LegalEntityRecognizer.d.ts.map