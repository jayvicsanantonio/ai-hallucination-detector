import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import {
  DomainRule,
  ValidationResult,
} from '@/modules/interfaces/DomainModule';
import { ContractTerm, LegalEntity } from './LegalModule';

export class ContractTermValidator {
  private rules: Map<string, DomainRule> = new Map();

  constructor() {
    this.initializeContractRules();
  }

  async validateContractTerms(
    content: ParsedContent,
    legalEntities: LegalEntity[]
  ): Promise<Issue[]> {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    // Extract contract terms from content
    const contractTerms = this.extractContractTerms(content);

    // Validate essential contract elements
    issues.push(
      ...this.validateEssentialElements(contractTerms, content)
    );

    // Validate party identification
    issues.push(
      ...this.validateParties(contractTerms, legalEntities, content)
    );

    // Validate consideration clauses
    issues.push(
      ...this.validateConsideration(contractTerms, content)
    );

    // Validate termination clauses
    issues.push(
      ...this.validateTerminationClauses(contractTerms, content)
    );

    // Validate legal capacity
    issues.push(
      ...this.validateLegalCapacity(
        contractTerms,
        legalEntities,
        content
      )
    );

    return issues;
  }

  async validateTerms(
    terms: ContractTerm[]
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const issues: Issue[] = [];

    for (const term of terms) {
      if (term.isRequired && !term.content.trim()) {
        issues.push({
          id: `contract-term-${term.id}-missing`,
          type: 'compliance_violation',
          severity: 'high',
          location: {
            start: term.location.start,
            end: term.location.end,
            line: 1,
            column: 1,
          },
          description: `Required contract term '${term.type}' is missing or incomplete`,
          evidence: [term.content],
          confidence: 90,
          moduleSource: 'contract-term-validator',
        });
      }

      // Validate term-specific requirements
      issues.push(...this.validateTermSpecificRequirements(term));
    }

    const processingTime = Math.max(1, Date.now() - startTime);
    const confidence =
      issues.length === 0
        ? 95
        : Math.max(20, 95 - issues.length * 15);

    return {
      moduleId: 'contract-term-validator',
      issues,
      confidence,
      processingTime,
    };
  }

  async updateRules(newRules: DomainRule[]): Promise<void> {
    for (const rule of newRules) {
      this.rules.set(rule.id, rule);
    }
  }

  private extractContractTerms(
    content: ParsedContent
  ): ContractTerm[] {
    const terms: ContractTerm[] = [];
    const text = content.extractedText;

    // Extract parties
    const partyMatches = text.matchAll(
      /(?:party|parties|between|among)\s+([^.]+)/gi
    );
    for (const match of partyMatches) {
      if (match.index !== undefined) {
        const fullMatch = match[1].trim();
        // Split on 'and' to get individual parties
        const individualParties = fullMatch.split(/\s+and\s+/i);

        for (const party of individualParties) {
          terms.push({
            id: `party-${terms.length}`,
            type: 'party',
            content: party.trim(),
            location: {
              start: match.index,
              end: match.index + match[0].length,
            },
            isRequired: true,
          });
        }
      }
    }

    // Extract consideration clauses
    const considerationMatches = text.matchAll(
      /(?:consideration|payment|compensation|fee)\s+([^.]+)/gi
    );
    for (const match of considerationMatches) {
      if (match.index !== undefined) {
        terms.push({
          id: `consideration-${terms.length}`,
          type: 'consideration',
          content: match[1].trim(),
          location: {
            start: match.index,
            end: match.index + match[0].length,
          },
          isRequired: true,
        });
      }
    }

    // Extract obligations
    const obligationMatches = text.matchAll(
      /(?:shall|must|will|agrees?\s+to)\s+([^.]+)/gi
    );
    for (const match of obligationMatches) {
      if (match.index !== undefined) {
        terms.push({
          id: `obligation-${terms.length}`,
          type: 'obligation',
          content: match[1].trim(),
          location: {
            start: match.index,
            end: match.index + match[0].length,
          },
          isRequired: false,
        });
      }
    }

    return terms;
  }

  private validateEssentialElements(
    terms: ContractTerm[],
    content: ParsedContent
  ): Issue[] {
    const issues: Issue[] = [];
    const essentialElements = [
      'party',
      'consideration',
      'obligation',
    ];

    for (const element of essentialElements) {
      const hasElement = terms.some((term) => term.type === element);
      if (!hasElement) {
        issues.push({
          id: `missing-${element}-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'critical',
          location: { start: 0, end: 100, line: 1, column: 1 },
          description: `Contract is missing essential element: ${element}`,
          evidence: [`No ${element} clause found in contract`],
          confidence: 85,
          moduleSource: 'contract-term-validator',
        });
      }
    }

    return issues;
  }

  private validateParties(
    terms: ContractTerm[],
    entities: LegalEntity[],
    content: ParsedContent
  ): Issue[] {
    const issues: Issue[] = [];
    const partyTerms = terms.filter((term) => term.type === 'party');

    if (partyTerms.length < 2) {
      issues.push({
        id: `insufficient-parties-${Date.now()}`,
        type: 'compliance_violation',
        severity: 'high',
        location: { start: 0, end: 100, line: 1, column: 1 },
        description: 'Contract must have at least two parties',
        evidence: [
          `Found only ${partyTerms.length} party references`,
        ],
        confidence: 90,
        moduleSource: 'contract-term-validator',
      });
    }

    // Validate party identification clarity
    for (const partyTerm of partyTerms) {
      if (partyTerm.content.length < 10) {
        issues.push({
          id: `vague-party-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'medium',
          location: partyTerm.location,
          description:
            'Party identification is too vague or incomplete',
          evidence: [partyTerm.content],
          confidence: 75,
          moduleSource: 'contract-term-validator',
        });
      }
    }

    return issues;
  }

  private validateConsideration(
    terms: ContractTerm[],
    content: ParsedContent
  ): Issue[] {
    const issues: Issue[] = [];
    const considerationTerms = terms.filter(
      (term) => term.type === 'consideration'
    );

    if (considerationTerms.length === 0) {
      issues.push({
        id: `missing-consideration-${Date.now()}`,
        type: 'compliance_violation',
        severity: 'critical',
        location: { start: 0, end: 100, line: 1, column: 1 },
        description: 'Contract lacks consideration clause',
        evidence: [
          'No consideration, payment, or compensation terms found',
        ],
        confidence: 90,
        moduleSource: 'contract-term-validator',
      });
    }

    // Validate consideration specificity
    for (const consideration of considerationTerms) {
      if (!this.hasSpecificAmount(consideration.content)) {
        issues.push({
          id: `vague-consideration-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'medium',
          location: consideration.location,
          description:
            'Consideration amount or terms are not specific enough',
          evidence: [consideration.content],
          confidence: 70,
          moduleSource: 'contract-term-validator',
        });
      }
    }

    return issues;
  }

  private validateTerminationClauses(
    terms: ContractTerm[],
    content: ParsedContent
  ): Issue[] {
    const issues: Issue[] = [];
    const text = content.extractedText.toLowerCase();

    const hasTerminationClause =
      /(?:terminat|end|expir|cancel)/i.test(text);

    if (!hasTerminationClause) {
      issues.push({
        id: `missing-termination-${Date.now()}`,
        type: 'compliance_violation',
        severity: 'medium',
        location: { start: 0, end: 100, line: 1, column: 1 },
        description: 'Contract lacks clear termination provisions',
        evidence: [
          'No termination, cancellation, or expiration clauses found',
        ],
        confidence: 80,
        moduleSource: 'contract-term-validator',
      });
    }

    return issues;
  }

  private validateLegalCapacity(
    terms: ContractTerm[],
    entities: LegalEntity[],
    content: ParsedContent
  ): Issue[] {
    const issues: Issue[] = [];

    // Check if parties have legal capacity indicators
    for (const entity of entities) {
      if (
        entity.type === 'individual' &&
        !this.hasCapacityIndicators(content.extractedText, entity)
      ) {
        issues.push({
          id: `capacity-concern-${Date.now()}`,
          type: 'compliance_violation',
          severity: 'medium',
          location: entity.location,
          description:
            'Individual party may lack clear legal capacity indicators',
          evidence: [entity.name],
          confidence: 60,
          moduleSource: 'contract-term-validator',
        });
      }
    }

    return issues;
  }

  private validateTermSpecificRequirements(
    term: ContractTerm
  ): Issue[] {
    const issues: Issue[] = [];

    switch (term.type) {
      case 'party':
        if (!this.isValidPartyIdentification(term.content)) {
          issues.push({
            id: `invalid-party-${Date.now()}`,
            type: 'compliance_violation',
            severity: 'medium',
            location: term.location,
            description:
              'Party identification does not meet standard requirements',
            evidence: [term.content],
            confidence: 75,
            moduleSource: 'contract-term-validator',
          });
        }
        break;

      case 'consideration':
        if (!this.isValidConsideration(term.content)) {
          issues.push({
            id: `invalid-consideration-${Date.now()}`,
            type: 'compliance_violation',
            severity: 'high',
            location: term.location,
            description:
              'Consideration clause is invalid or insufficient',
            evidence: [term.content],
            confidence: 80,
            moduleSource: 'contract-term-validator',
          });
        }
        break;
    }

    return issues;
  }

  private hasSpecificAmount(text: string): boolean {
    return /\$[\d,]+|\d+\s*(?:dollars?|usd|eur|gbp)/i.test(text);
  }

  private hasCapacityIndicators(
    text: string,
    entity: LegalEntity
  ): boolean {
    const capacityTerms =
      /(?:of legal age|competent|authorized|capacity)/i;
    return capacityTerms.test(text);
  }

  private isValidPartyIdentification(content: string): boolean {
    // Check for minimum requirements: name and some form of identification
    return content.length > 5 && /[A-Za-z]/.test(content);
  }

  private isValidConsideration(content: string): boolean {
    // Check for monetary amount or valuable consideration
    return (
      this.hasSpecificAmount(content) ||
      /(?:services?|goods?|property|rights?)/i.test(content)
    );
  }

  private initializeContractRules(): void {
    const contractRules: DomainRule[] = [
      {
        id: 'contract-001',
        name: 'essential-elements',
        description: 'Contract must contain all essential elements',
        severity: 'critical',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'contract-002',
        name: 'party-identification',
        description: 'Parties must be clearly identified',
        severity: 'high',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'contract-003',
        name: 'consideration-specificity',
        description: 'Consideration must be specific and adequate',
        severity: 'high',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    contractRules.forEach((rule) => this.rules.set(rule.id, rule));
  }
}
