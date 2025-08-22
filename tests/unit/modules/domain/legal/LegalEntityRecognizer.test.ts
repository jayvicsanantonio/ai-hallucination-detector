import { LegalEntityRecognizer } from '@/modules/domain/legal/LegalEntityRecognizer';
import { ParsedContent } from '@/models/core/ParsedContent';

describe('LegalEntityRecognizer', () => {
  let recognizer: LegalEntityRecognizer;
  let mockContent: ParsedContent;

  beforeEach(() => {
    recognizer = new LegalEntityRecognizer();

    mockContent = {
      id: 'test-content-1',
      originalContent: 'Legal document with entities',
      extractedText:
        'Agreement between Microsoft Corporation and Apple Inc. involving John Smith and Jane Doe LLC.',
      contentType: 'text',
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: {},
      createdAt: new Date(),
    };
  });

  describe('extractLegalEntities', () => {
    it('should extract legal entities from content', async () => {
      const entities = await recognizer.extractLegalEntities(
        mockContent
      );

      expect(Array.isArray(entities)).toBe(true);
      expect(entities.length).toBeGreaterThan(0);
    });

    it('should extract corporations correctly', async () => {
      const corporationContent = {
        ...mockContent,
        extractedText:
          'Microsoft Corporation and Apple Inc. are parties to this agreement.',
      };

      const entities = await recognizer.extractLegalEntities(
        corporationContent
      );

      const corporations = entities.filter(
        (e) => e.type === 'corporation'
      );

      expect(corporations.length).toBeGreaterThan(0);
      expect(
        corporations.some((c) =>
          c.name.includes('Microsoft Corporation')
        )
      ).toBe(true);
      expect(
        corporations.some((c) => c.name.includes('Apple Inc'))
      ).toBe(true);
    });

    it('should extract LLCs correctly', async () => {
      const llcContent = {
        ...mockContent,
        extractedText:
          'Tech Solutions LLC and Digital Services L.L.C. are the contracting parties.',
      };

      const entities = await recognizer.extractLegalEntities(
        llcContent
      );

      const llcs = entities.filter((e) => e.type === 'llc');
      expect(llcs.length).toBeGreaterThan(0);
      expect(
        llcs.some((l) => l.name.includes('Tech Solutions LLC'))
      ).toBe(true);
    });

    it('should extract partnerships correctly', async () => {
      const partnershipContent = {
        ...mockContent,
        extractedText:
          'Smith & Associates LP and Johnson Partners LLP are involved.',
      };

      const entities = await recognizer.extractLegalEntities(
        partnershipContent
      );

      const partnerships = entities.filter(
        (e) => e.type === 'partnership'
      );
      expect(partnerships.length).toBeGreaterThan(0);
    });

    it('should extract individuals correctly', async () => {
      const individualContent = {
        ...mockContent,
        extractedText:
          'Mr. John Smith and Dr. Jane Doe are the individual parties to this contract.',
      };

      const entities = await recognizer.extractLegalEntities(
        individualContent
      );

      const individuals = entities.filter(
        (e) => e.type === 'individual'
      );
      expect(individuals.length).toBeGreaterThan(0);
      expect(
        individuals.some((i) => i.name.includes('John Smith'))
      ).toBe(true);
      expect(
        individuals.some((i) => i.name.includes('Jane Doe'))
      ).toBe(true);
    });

    it('should extract government entities correctly', async () => {
      const governmentContent = {
        ...mockContent,
        extractedText:
          'The United States Department of Commerce and State of California are parties.',
      };

      const entities = await recognizer.extractLegalEntities(
        governmentContent
      );

      const governmentEntities = entities.filter(
        (e) => e.type === 'government'
      );
      expect(governmentEntities.length).toBeGreaterThan(0);
      expect(
        governmentEntities.some((g) =>
          g.name.includes('United States')
        )
      ).toBe(true);
      expect(
        governmentEntities.some((g) =>
          g.name.includes('State of California')
        )
      ).toBe(true);
    });

    it('should detect jurisdictions correctly', async () => {
      const jurisdictionContent = {
        ...mockContent,
        extractedText:
          'ABC Corporation incorporated in Delaware and XYZ LLC organized under California law are parties.',
      };

      const entities = await recognizer.extractLegalEntities(
        jurisdictionContent
      );
      console.log('Jurisdiction test entities:', entities);

      expect(
        entities.some((e) => e.jurisdiction === 'delaware')
      ).toBe(true);
      expect(
        entities.some((e) => e.jurisdiction === 'california')
      ).toBe(true);
    });

    it('should extract registration numbers when present', async () => {
      const registrationContent = {
        ...mockContent,
        extractedText:
          'ABC Corporation (EIN: 12-3456789) and XYZ LLC (Registration No: ABC123) are parties.',
      };

      const entities = await recognizer.extractLegalEntities(
        registrationContent
      );

      expect(
        entities.some((e) => e.registrationNumber === '12-3456789')
      ).toBe(true);
      expect(
        entities.some((e) => e.registrationNumber === 'ABC123')
      ).toBe(true);
    });
  });

  describe('entity type detection', () => {
    it('should distinguish between corporations and individuals', async () => {
      const mixedContent = {
        ...mockContent,
        extractedText:
          'John Smith Corporation and John Smith the individual are different entities.',
      };

      const entities = await recognizer.extractLegalEntities(
        mixedContent
      );

      const corporations = entities.filter(
        (e) => e.type === 'corporation'
      );
      const individuals = entities.filter(
        (e) => e.type === 'individual'
      );

      expect(corporations.length).toBeGreaterThan(0);
      expect(individuals.length).toBeGreaterThan(0);
    });

    it('should avoid false positives for individual names', async () => {
      const corporateContent = {
        ...mockContent,
        extractedText:
          'Smith Corporation and Jones LLC are business entities, not individuals.',
      };

      const entities = await recognizer.extractLegalEntities(
        corporateContent
      );

      const individuals = entities.filter(
        (e) => e.type === 'individual'
      );
      expect(individuals.length).toBe(0);
    });

    it('should handle complex entity names', async () => {
      const complexContent = {
        ...mockContent,
        extractedText:
          'Advanced Technology Solutions & Consulting Services LLC is the contractor.',
      };

      const entities = await recognizer.extractLegalEntities(
        complexContent
      );

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].type).toBe('llc');
    });
  });

  describe('jurisdiction detection', () => {
    it('should detect state jurisdictions', async () => {
      const stateContent = {
        ...mockContent,
        extractedText:
          'ABC Corp incorporated in Delaware and XYZ LLC organized under California law.',
      };

      const entities = await recognizer.extractLegalEntities(
        stateContent
      );

      expect(
        entities.some((e) => e.jurisdiction.includes('delaware'))
      ).toBe(true);
      expect(
        entities.some((e) => e.jurisdiction.includes('california'))
      ).toBe(true);
    });

    it('should detect federal jurisdiction', async () => {
      const federalContent = {
        ...mockContent,
        extractedText:
          'The United States Government and U.S. Department of Defense are parties.',
      };

      const entities = await recognizer.extractLegalEntities(
        federalContent
      );

      const federalEntities = entities.filter(
        (e) => e.jurisdiction === 'federal'
      );
      expect(federalEntities.length).toBeGreaterThan(0);
    });

    it('should handle unknown jurisdictions gracefully', async () => {
      const unknownContent = {
        ...mockContent,
        extractedText:
          'Foreign Corporation XYZ is a party to this agreement.',
      };

      const entities = await recognizer.extractLegalEntities(
        unknownContent
      );

      expect(entities.some((e) => e.jurisdiction === 'unknown')).toBe(
        true
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const emptyContent = {
        ...mockContent,
        extractedText: '',
      };

      const entities = await recognizer.extractLegalEntities(
        emptyContent
      );

      expect(Array.isArray(entities)).toBe(true);
      expect(entities.length).toBe(0);
    });

    it('should handle content with no entities', async () => {
      const noEntitiesContent = {
        ...mockContent,
        extractedText:
          'This is just plain text without any legal entities mentioned.',
      };

      const entities = await recognizer.extractLegalEntities(
        noEntitiesContent
      );

      expect(Array.isArray(entities)).toBe(true);
      expect(entities.length).toBe(0);
    });

    it('should handle special characters in entity names', async () => {
      const specialCharContent = {
        ...mockContent,
        extractedText:
          "Smith & Associates, LLC and O'Brien Corporation are parties.",
      };

      const entities = await recognizer.extractLegalEntities(
        specialCharContent
      );

      expect(entities.length).toBeGreaterThan(0);
    });

    it('should handle multiple occurrences of the same entity', async () => {
      const duplicateContent = {
        ...mockContent,
        extractedText:
          'ABC Corporation agrees that ABC Corporation will perform the services.',
      };

      const entities = await recognizer.extractLegalEntities(
        duplicateContent
      );

      // Should not create duplicate entities
      const uniqueNames = new Set(entities.map((e) => e.name));
      expect(entities.length).toBe(uniqueNames.size);
    });

    it('should handle very long entity names', async () => {
      const longNameContent = {
        ...mockContent,
        extractedText:
          'International Advanced Technology Solutions and Consulting Services Corporation is the contractor.',
      };

      const entities = await recognizer.extractLegalEntities(
        longNameContent
      );

      expect(entities.length).toBeGreaterThan(0);
      expect(entities[0].name.length).toBeGreaterThan(20);
    });
  });

  describe('location tracking', () => {
    it('should track entity locations in text', async () => {
      const entities = await recognizer.extractLegalEntities(
        mockContent
      );

      for (const entity of entities) {
        expect(entity.location).toBeDefined();
        expect(entity.location.start).toBeGreaterThanOrEqual(0);
        expect(entity.location.end).toBeGreaterThan(
          entity.location.start
        );
        expect(entity.location.end).toBeLessThanOrEqual(
          mockContent.extractedText.length
        );
      }
    });

    it('should have accurate location information', async () => {
      const testContent = {
        ...mockContent,
        extractedText: 'ABC Corporation is the first entity.',
      };

      const entities = await recognizer.extractLegalEntities(
        testContent
      );

      if (entities.length > 0) {
        const entity = entities[0];
        const extractedName = testContent.extractedText.substring(
          entity.location.start,
          entity.location.end
        );
        expect(entity.name).toBe(extractedName);
      }
    });
  });
});
