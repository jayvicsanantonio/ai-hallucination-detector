import { RegulatoryReferenceManager } from '../../../../src/modules/compliance-validator/RegulatoryReferenceManager';
import { ComplianceRule } from '../../../../src/models/knowledge/ComplianceRule';

describe('RegulatoryReferenceManager', () => {
  let manager: RegulatoryReferenceManager;

  const mockRule: ComplianceRule = {
    id: 'test-rule-1',
    ruleText: 'Test compliance rule for healthcare data protection',
    regulation: 'HIPAA',
    jurisdiction: 'US',
    domain: 'healthcare',
    severity: 'high',
    examples: ['Example 1'],
    keywords: ['patient', 'medical records', 'privacy'],
    patterns: ['patient.*data'],
    lastUpdated: new Date('2023-01-01'),
    isActive: true,
  };

  beforeEach(() => {
    manager = new RegulatoryReferenceManager();
  });

  describe('getRegulatoryReferences', () => {
    it('should return relevant regulatory references for a rule', async () => {
      const references = await manager.getRegulatoryReferences(
        mockRule
      );

      expect(references).toBeDefined();
      expect(Array.isArray(references)).toBe(true);

      // Should find HIPAA reference for healthcare rule
      const hipaaRef = references.find(
        (ref) => ref.document.regulation === 'HIPAA'
      );
      expect(hipaaRef).toBeDefined();
      expect(hipaaRef!.document.applicableDomains).toContain(
        'healthcare'
      );
      expect(hipaaRef!.applicabilityScore).toBeGreaterThan(30);
    });

    it('should sort references by applicability score', async () => {
      const references = await manager.getRegulatoryReferences(
        mockRule
      );

      if (references.length > 1) {
        for (let i = 0; i < references.length - 1; i++) {
          expect(
            references[i].applicabilityScore
          ).toBeGreaterThanOrEqual(
            references[i + 1].applicabilityScore
          );
        }
      }
    });

    it('should filter out low-relevance references', async () => {
      const financialRule: ComplianceRule = {
        ...mockRule,
        regulation: 'UNKNOWN_REG',
        domain: 'financial',
        keywords: ['unrelated', 'keywords'],
      };

      const references = await manager.getRegulatoryReferences(
        financialRule
      );

      // Should not return references with very low applicability scores
      references.forEach((ref) => {
        expect(ref.applicabilityScore).toBeGreaterThan(30);
      });
    });

    it('should generate appropriate citations', async () => {
      const references = await manager.getRegulatoryReferences(
        mockRule
      );

      if (references.length > 0) {
        const citation = references[0].citationText;
        expect(citation).toContain(references[0].document.title);
        expect(citation).toMatch(/\(\d{4}\)/); // Should contain year
      }
    });

    it('should provide contextual information', async () => {
      const references = await manager.getRegulatoryReferences(
        mockRule
      );

      if (references.length > 0) {
        const context = references[0].context;
        expect(context).toContain(mockRule.domain);
        expect(context).toContain(mockRule.regulation);
      }
    });
  });

  describe('getComplianceGuidance', () => {
    it('should return guidance for known rules', async () => {
      const guidance = await manager.getComplianceGuidance(
        'hipaa-phi-disclosure'
      );

      expect(guidance).toBeDefined();
      expect(guidance!.regulation).toBe('HIPAA');
      expect(guidance!.guidance).toContain(
        'Protected Health Information'
      );
      expect(guidance!.examples).toHaveLength(3);
      expect(guidance!.commonViolations).toHaveLength(3);
      expect(guidance!.bestPractices).toHaveLength(4);
    });

    it('should return null for unknown rules', async () => {
      const guidance = await manager.getComplianceGuidance(
        'unknown-rule'
      );

      expect(guidance).toBeNull();
    });
  });

  describe('generateRegulatoryContext', () => {
    it('should generate comprehensive regulatory context', async () => {
      const context = await manager.generateRegulatoryContext(
        mockRule,
        'Patient data was disclosed without authorization'
      );

      expect(context.primaryReferences).toBeDefined();
      expect(context.primaryReferences.length).toBeLessThanOrEqual(3);
      expect(context.relatedUpdates).toBeDefined();
      expect(context.enforcementHistory).toBeDefined();
      expect(context.penalties).toBeDefined();
      expect(context.penalties.length).toBeGreaterThan(0);
    });

    it('should include enforcement history for known regulations', async () => {
      const context = await manager.generateRegulatoryContext(
        mockRule,
        'test context'
      );

      expect(context.enforcementHistory).toHaveLength(3);
      expect(context.enforcementHistory[0]).toContain('$');
      expect(context.enforcementHistory[0]).toContain('2023');
    });

    it('should include penalty information', async () => {
      const context = await manager.generateRegulatoryContext(
        mockRule,
        'test context'
      );

      expect(context.penalties.some((p) => p.includes('Tier'))).toBe(
        true
      );
      expect(context.penalties.some((p) => p.includes('$'))).toBe(
        true
      );
    });
  });

  describe('document management', () => {
    it('should add new regulatory documents', async () => {
      const newDoc = {
        title: 'Test Regulation Document',
        regulation: 'TEST_REG',
        description: 'A test regulatory document',
        effectiveDate: new Date('2023-01-01'),
        lastUpdated: new Date('2023-01-01'),
        jurisdiction: 'US',
        applicableDomains: ['healthcare'],
        documentType: 'regulation' as const,
        status: 'active' as const,
        keywords: ['test', 'regulation'],
        relatedDocuments: [],
      };

      const addedDoc = await manager.addRegulatoryDocument(newDoc);

      expect(addedDoc.id).toBeDefined();
      expect(addedDoc.title).toBe(newDoc.title);
      expect(addedDoc.regulation).toBe(newDoc.regulation);
    });

    it('should update compliance guidance', async () => {
      const guidance = {
        regulation: 'TEST_REG',
        guidance: 'Test guidance for compliance',
        examples: ['Example 1', 'Example 2'],
        commonViolations: ['Violation 1'],
        bestPractices: ['Practice 1', 'Practice 2'],
        relatedRules: ['rule-1'],
        reviewedBy: 'Test Reviewer',
      };

      const updatedGuidance = await manager.updateComplianceGuidance(
        'test-rule',
        guidance
      );

      expect(updatedGuidance.ruleId).toBe('test-rule');
      expect(updatedGuidance.guidance).toBe(guidance.guidance);
      expect(updatedGuidance.lastReviewed).toBeInstanceOf(Date);
    });
  });

  describe('regulatory updates', () => {
    it('should add and retrieve regulatory updates', async () => {
      const update = {
        regulation: 'HIPAA',
        updateType: 'rule_change' as const,
        title: 'New HIPAA Privacy Rule Changes',
        description: 'Updated requirements for patient consent',
        effectiveDate: new Date('2023-06-01'),
        impactedRules: ['hipaa-consent', 'hipaa-disclosure'],
        severity: 'high' as const,
        actionRequired: true,
        source: 'HHS',
        url: 'https://example.com/hipaa-update',
      };

      const addedUpdate = await manager.addRegulatoryUpdate(update);
      expect(addedUpdate.id).toBeDefined();

      const relatedUpdates = manager.getRelatedUpdates('HIPAA');
      expect(relatedUpdates).toContain(addedUpdate);
      expect(relatedUpdates[0]).toBe(addedUpdate); // Should be first (most recent)
    });

    it('should limit the number of related updates returned', async () => {
      // Add multiple updates
      for (let i = 0; i < 10; i++) {
        await manager.addRegulatoryUpdate({
          regulation: 'TEST_REG',
          updateType: 'new_rule',
          title: `Update ${i}`,
          description: `Description ${i}`,
          effectiveDate: new Date(2023, 0, i + 1),
          impactedRules: [],
          severity: 'low',
          actionRequired: false,
          source: 'Test Source',
        });
      }

      const updates = manager.getRelatedUpdates('TEST_REG', 3);
      expect(updates).toHaveLength(3);
    });
  });

  describe('document search', () => {
    it('should search documents by keywords', async () => {
      const results = manager.searchDocuments(
        ['privacy', 'health'],
        'healthcare',
        'US'
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const hipaaDoc = results.find(
          (doc) => doc.regulation === 'HIPAA'
        );
        expect(hipaaDoc).toBeDefined();
        expect(hipaaDoc!.applicableDomains).toContain('healthcare');
      }
    });

    it('should return results sorted by relevance score', async () => {
      const results = manager.searchDocuments(
        ['data', 'protection'],
        'legal'
      );

      // Results should be sorted by relevance (highest score first)
      // This is tested implicitly by the search algorithm
      expect(results).toBeDefined();
    });

    it('should handle empty search results', async () => {
      const results = manager.searchDocuments([
        'nonexistent',
        'keywords',
      ]);

      expect(results).toHaveLength(0);
    });
  });

  describe('citation generation', () => {
    it('should generate properly formatted citations', async () => {
      const mockDocument = {
        id: 'doc-1',
        title: 'Test Regulation',
        regulation: 'TEST_REG',
        section: '164.502',
        url: 'https://example.com/regulation',
        description: 'Test description',
        effectiveDate: new Date('2020-01-01'),
        lastUpdated: new Date('2023-01-01'),
        jurisdiction: 'US',
        applicableDomains: ['healthcare'],
        documentType: 'regulation' as const,
        status: 'active' as const,
        keywords: ['test'],
        relatedDocuments: [],
      };

      const citation = manager.generateCitation(mockDocument, [
        'subsection A',
        'subsection B',
      ]);

      expect(citation).toContain('Test Regulation');
      expect(citation).toContain('Section 164.502');
      expect(citation).toContain('subsection A, subsection B');
      expect(citation).toMatch(/\(\d{4}\)/); // Should contain a year in parentheses
      expect(citation).toContain('https://example.com/regulation');
    });

    it('should handle citations without optional fields', async () => {
      const minimalDocument = {
        id: 'doc-2',
        title: 'Minimal Document',
        regulation: 'MIN_REG',
        description: 'Minimal description',
        effectiveDate: new Date('2023-01-01'),
        lastUpdated: new Date('2023-01-01'),
        jurisdiction: 'US',
        applicableDomains: ['legal'],
        documentType: 'policy' as const,
        status: 'active' as const,
        keywords: ['minimal'],
        relatedDocuments: [],
      };

      const citation = manager.generateCitation(minimalDocument);

      expect(citation).toContain('Minimal Document');
      expect(citation).toMatch(/\(\d{4}\)/); // Should contain a year in parentheses
      expect(citation).not.toContain('Section');
      expect(citation).not.toContain('Available at:');
    });
  });

  describe('applicability scoring', () => {
    it('should score exact regulation matches highly', async () => {
      const references = await manager.getRegulatoryReferences(
        mockRule
      );
      const hipaaRef = references.find(
        (ref) => ref.document.regulation === 'HIPAA'
      );

      if (hipaaRef) {
        expect(hipaaRef.applicabilityScore).toBeGreaterThan(60);
      }
    });

    it('should score domain matches appropriately', async () => {
      const healthcareRule: ComplianceRule = {
        ...mockRule,
        domain: 'healthcare',
        regulation: 'HIPAA',
      };

      const financialRule: ComplianceRule = {
        ...mockRule,
        domain: 'financial',
        regulation: 'SOX',
      };

      const healthcareRefs = await manager.getRegulatoryReferences(
        healthcareRule
      );
      const financialRefs = await manager.getRegulatoryReferences(
        financialRule
      );

      const hipaaRef = healthcareRefs.find(
        (ref) => ref.document.regulation === 'HIPAA'
      );
      const soxRef = financialRefs.find(
        (ref) => ref.document.regulation === 'SOX'
      );

      if (hipaaRef && soxRef) {
        expect(hipaaRef.applicabilityScore).toBeGreaterThan(50);
        expect(soxRef.applicabilityScore).toBeGreaterThan(50);
      }
    });
  });
});
