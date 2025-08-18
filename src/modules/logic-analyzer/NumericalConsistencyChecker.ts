import {
  ParsedContent,
  ExtractedEntity,
} from '@/models/core/ParsedContent';
import { TextLocation } from '@/models/core/TextLocation';
import { IssueSeverity } from '@/models/core/ContentTypes';
import { NumericalInconsistency } from './LogicAnalyzer';

export interface NumericalValue {
  value: number;
  unit?: string;
  location: TextLocation;
  context: string;
  originalText: string;
  type:
    | 'integer'
    | 'decimal'
    | 'percentage'
    | 'currency'
    | 'measurement';
}

export interface Calculation {
  expression: string;
  expectedResult: number;
  actualResult?: number;
  location: TextLocation;
  operands: NumericalValue[];
  operator: string;
  confidence: number;
}

export interface NumericalRange {
  min: number;
  max: number;
  unit?: string;
  location: TextLocation;
  context: string;
}

export class NumericalConsistencyChecker {
  private numberPatterns = {
    integer: /\b\d{1,3}(?:,\d{3})*\b/g,
    decimal: /\b\d{1,3}(?:,\d{3})*\.\d+\b/g,
    percentage: /\b\d+(?:\.\d+)?%\b/g,
    currency: /[$€£¥]\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g,
    measurement:
      /\b\d+(?:\.\d+)?\s*(?:kg|lb|m|ft|cm|in|km|mi|l|gal|oz|g)\b/gi,
  };

  private calculationPatterns = [
    /(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g,
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g,
    /(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g,
    /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g,
    /(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g,
    /(\d+(?:\.\d+)?)\s*÷\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g,
    // More flexible patterns with currency symbols
    /\$\s*(\d+(?:\.\d+)?)\s*\+\s*\$\s*(\d+(?:\.\d+)?)\s*=\s*\$\s*(\d+(?:\.\d+)?)/g,
    // Patterns with units
    /(\d+(?:\.\d+)?)\s*km\s*\+\s*(\d+(?:\.\d+)?)\s*km\s*=\s*(\d+(?:\.\d+)?)\s*km/g,
  ];

  private unitConversions = {
    length: {
      m: 1,
      cm: 0.01,
      km: 1000,
      ft: 0.3048,
      in: 0.0254,
      mi: 1609.34,
    },
    weight: {
      kg: 1,
      g: 0.001,
      lb: 0.453592,
      oz: 0.0283495,
    },
    volume: {
      l: 1,
      ml: 0.001,
      gal: 3.78541,
      oz: 0.0295735,
    },
  };

  async checkNumericalConsistency(
    content: ParsedContent
  ): Promise<NumericalInconsistency[]> {
    const inconsistencies: NumericalInconsistency[] = [];

    try {
      const text = content.extractedText;

      if (!text) {
        return inconsistencies;
      }

      // Extract all numerical values
      const numericalValues = this.extractNumericalValues(text);

      // Check calculation errors
      const calculationErrors = await this.checkCalculationErrors(
        text
      );
      inconsistencies.push(...calculationErrors);

      // Check unit mismatches
      const unitMismatches =
        this.checkUnitMismatches(numericalValues);
      inconsistencies.push(...unitMismatches);

      // Check range violations
      const rangeViolations = this.checkRangeViolations(
        numericalValues,
        text
      );
      inconsistencies.push(...rangeViolations);

      // Check sum mismatches (for financial content)
      const sumMismatches = this.checkSumMismatches(
        numericalValues,
        text
      );
      inconsistencies.push(...sumMismatches);

      // Check percentage consistency
      const percentageErrors = this.checkPercentageConsistency(
        numericalValues,
        text
      );
      inconsistencies.push(...percentageErrors);

      return inconsistencies;
    } catch (error) {
      console.error('Error checking numerical consistency:', error);
      return [];
    }
  }

  private extractNumericalValues(text: string): NumericalValue[] {
    const values: NumericalValue[] = [];

    Object.entries(this.numberPatterns).forEach(([type, pattern]) => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(text)) !== null) {
        const originalText = match[0];
        const value = this.parseNumericalValue(
          originalText,
          type as any
        );

        if (value !== null) {
          values.push({
            value,
            unit: this.extractUnit(originalText),
            location: {
              start: match.index,
              end: match.index + originalText.length,
              line: this.getLineNumber(text, match.index),
              column: this.getColumnNumber(text, match.index),
            },
            context: this.getContext(text, match.index, 50),
            originalText,
            type: type as any,
          });
        }
      }
    });

    return values.sort((a, b) => a.location.start - b.location.start);
  }

  private async checkCalculationErrors(
    text: string
  ): Promise<NumericalInconsistency[]> {
    const errors: NumericalInconsistency[] = [];

    for (const pattern of this.calculationPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);

      while ((match = regex.exec(text)) !== null) {
        const operand1 = parseFloat(match[1]);
        const operand2 = parseFloat(match[2]);
        const statedResult = parseFloat(match[3]);

        let expectedResult: number;
        let operator: string;

        // Determine operation based on pattern
        if (
          text
            .substring(match.index, match.index + match[0].length)
            .includes('+')
        ) {
          expectedResult = operand1 + operand2;
          operator = '+';
        } else if (
          text
            .substring(match.index, match.index + match[0].length)
            .includes('-')
        ) {
          expectedResult = operand1 - operand2;
          operator = '-';
        } else if (
          text
            .substring(match.index, match.index + match[0].length)
            .includes('*') ||
          text
            .substring(match.index, match.index + match[0].length)
            .includes('×')
        ) {
          expectedResult = operand1 * operand2;
          operator = '*';
        } else if (
          text
            .substring(match.index, match.index + match[0].length)
            .includes('/') ||
          text
            .substring(match.index, match.index + match[0].length)
            .includes('÷')
        ) {
          expectedResult = operand1 / operand2;
          operator = '/';
        } else {
          continue;
        }

        // Check for significant difference (accounting for rounding)
        const tolerance = Math.max(
          0.01,
          Math.abs(expectedResult) * 0.001
        );
        if (Math.abs(expectedResult - statedResult) > tolerance) {
          errors.push({
            id: `calc_error_${Date.now()}_${Math.random()}`,
            type: 'calculation_error',
            description: `Calculation error: ${operand1} ${operator} ${operand2} should equal ${expectedResult.toFixed(
              2
            )}, not ${statedResult}`,
            location: {
              start: match.index,
              end: match.index + match[0].length,
              line: this.getLineNumber(text, match.index),
              column: this.getColumnNumber(text, match.index),
            },
            expectedValue: expectedResult,
            actualValue: statedResult,
            severity: this.calculateSeverityForCalculationError(
              expectedResult,
              statedResult
            ),
            confidence: 95,
          });
        }
      }
    }

    return errors;
  }

  private checkUnitMismatches(
    values: NumericalValue[]
  ): NumericalInconsistency[] {
    const errors: NumericalInconsistency[] = [];

    // Group values by context similarity
    const contextGroups = this.groupValuesByContext(values);

    contextGroups.forEach((group) => {
      if (group.length > 1) {
        const units = new Set(
          group.map((v) => v.unit).filter((u) => u)
        );

        if (units.size > 1) {
          // Check if units are compatible (same measurement type)
          const unitTypes = Array.from(units).map((unit) =>
            this.getUnitType(unit!)
          );
          const uniqueTypes = new Set(unitTypes.filter((t) => t));

          if (uniqueTypes.size > 1) {
            // Different unit types in same context
            group.forEach((value) => {
              if (value.unit) {
                errors.push({
                  id: `unit_mismatch_${Date.now()}_${Math.random()}`,
                  type: 'unit_mismatch',
                  description: `Unit mismatch: mixing different measurement types in same context`,
                  location: value.location,
                  severity: 'medium',
                  confidence: 80,
                });
              }
            });
          }
        }
      }
    });

    return errors;
  }

  private checkRangeViolations(
    values: NumericalValue[],
    text: string
  ): NumericalInconsistency[] {
    const errors: NumericalInconsistency[] = [];

    // Extract range specifications from text
    const ranges = this.extractRanges(text);

    ranges.forEach((range) => {
      // Find values that should be within this range
      const relevantValues = values.filter((value) =>
        this.isValueRelevantToRange(value, range)
      );

      relevantValues.forEach((value) => {
        if (value.value < range.min || value.value > range.max) {
          errors.push({
            id: `range_violation_${Date.now()}_${Math.random()}`,
            type: 'range_violation',
            description: `Value ${value.value} is outside expected range ${range.min}-${range.max}`,
            location: value.location,
            expectedValue: (range.min + range.max) / 2, // Midpoint as expected
            actualValue: value.value,
            severity: this.calculateSeverityForRangeViolation(
              value.value,
              range
            ),
            confidence: 70,
          });
        }
      });
    });

    return errors;
  }

  private checkSumMismatches(
    values: NumericalValue[],
    text: string
  ): NumericalInconsistency[] {
    const errors: NumericalInconsistency[] = [];

    // Look for sum patterns in text
    const sumPatterns = [
      /total:?\s*(\d+(?:\.\d+)?)/gi,
      /sum:?\s*(\d+(?:\.\d+)?)/gi,
      /grand total:?\s*(\d+(?:\.\d+)?)/gi,
      /the total is\s*(\d+(?:\.\d+)?)/gi,
      /total.*?(\d+(?:\.\d+)?)/gi,
    ];

    sumPatterns.forEach((pattern) => {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const statedTotal = parseFloat(match[1]);
        const context = this.getContext(text, match.index, 200);

        // Find values that might contribute to this sum
        const contributingValues = values.filter(
          (value) =>
            value.location.start < match!.index &&
            value.location.start > match!.index - 500 && // Within 500 chars before
            value.type !== 'percentage' // Exclude percentages from sums
        );

        if (contributingValues.length > 1) {
          const calculatedSum = contributingValues.reduce(
            (sum, val) => sum + val.value,
            0
          );
          const tolerance = Math.max(0.01, statedTotal * 0.001);

          if (Math.abs(calculatedSum - statedTotal) > tolerance) {
            errors.push({
              id: `sum_mismatch_${Date.now()}_${Math.random()}`,
              type: 'sum_mismatch',
              description: `Sum mismatch: stated total ${statedTotal} doesn't match calculated sum ${calculatedSum.toFixed(
                2
              )}`,
              location: {
                start: match.index,
                end: match.index + match[0].length,
                line: this.getLineNumber(text, match.index),
                column: this.getColumnNumber(text, match.index),
              },
              expectedValue: calculatedSum,
              actualValue: statedTotal,
              severity: this.calculateSeverityForSumMismatch(
                calculatedSum,
                statedTotal
              ),
              confidence: 75,
            });
          }
        }
      }
    });

    return errors;
  }

  private checkPercentageConsistency(
    values: NumericalValue[],
    text: string
  ): NumericalInconsistency[] {
    const errors: NumericalInconsistency[] = [];

    const percentages = values.filter((v) => v.type === 'percentage');

    // Group percentages by context
    const contextGroups = this.groupValuesByContext(percentages);

    contextGroups.forEach((group) => {
      if (group.length > 1) {
        const sum = group.reduce((total, p) => total + p.value, 0);

        // Check if percentages should sum to 100%
        if (this.shouldSumToHundred(group, text)) {
          const tolerance = 1; // 1% tolerance
          if (Math.abs(sum - 100) > tolerance) {
            errors.push({
              id: `percentage_sum_${Date.now()}_${Math.random()}`,
              type: 'calculation_error',
              description: `Percentages should sum to 100% but sum to ${sum.toFixed(
                1
              )}%`,
              location: group[0].location, // Use first percentage location
              expectedValue: 100,
              actualValue: sum,
              severity: 'medium',
              confidence: 80,
            });
          }
        }
      }
    });

    return errors;
  }

  // Helper methods
  private parseNumericalValue(
    text: string,
    type: string
  ): number | null {
    try {
      // Remove currency symbols and units
      let cleanText = text.replace(/[$€£¥,]/g, '');
      cleanText = cleanText.replace(/[a-zA-Z%]/g, '');

      const value = parseFloat(cleanText);
      return isNaN(value) ? null : value;
    } catch {
      return null;
    }
  }

  private extractUnit(text: string): string | undefined {
    const unitPattern = /[a-zA-Z%]+$/;
    const match = text.match(unitPattern);
    return match ? match[0] : undefined;
  }

  private getContext(
    text: string,
    position: number,
    radius: number
  ): string {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius);
    return text.substring(start, end);
  }

  private groupValuesByContext(
    values: NumericalValue[]
  ): NumericalValue[][] {
    const groups: NumericalValue[][] = [];
    const used = new Set<number>();

    values.forEach((value, index) => {
      if (used.has(index)) return;

      const group = [value];
      used.add(index);

      // Find other values with similar context
      for (let i = index + 1; i < values.length; i++) {
        if (used.has(i)) continue;

        const other = values[i];
        if (this.haveSimilarContext(value, other)) {
          group.push(other);
          used.add(i);
        }
      }

      groups.push(group);
    });

    return groups;
  }

  private haveSimilarContext(
    value1: NumericalValue,
    value2: NumericalValue
  ): boolean {
    // Check if values are close in position
    const distance = Math.abs(
      value1.location.start - value2.location.start
    );
    if (distance > 200) return false;

    // Check for common keywords in context
    const context1Words = new Set(
      value1.context.toLowerCase().split(/\s+/)
    );
    const context2Words = new Set(
      value2.context.toLowerCase().split(/\s+/)
    );

    const intersection = new Set(
      [...context1Words].filter((x) => context2Words.has(x))
    );
    const union = new Set([...context1Words, ...context2Words]);

    return intersection.size / union.size > 0.3;
  }

  private getUnitType(unit: string): string | null {
    const lowerUnit = unit.toLowerCase();

    for (const [type, conversions] of Object.entries(
      this.unitConversions
    )) {
      if (lowerUnit in conversions) {
        return type;
      }
    }

    return null;
  }

  private extractRanges(text: string): NumericalRange[] {
    const ranges: NumericalRange[] = [];
    const rangePattern =
      /(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)/g;

    let match;
    while ((match = rangePattern.exec(text)) !== null) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);

      if (min < max) {
        ranges.push({
          min,
          max,
          location: {
            start: match.index,
            end: match.index + match[0].length,
            line: this.getLineNumber(text, match.index),
            column: this.getColumnNumber(text, match.index),
          },
          context: this.getContext(text, match.index, 50),
        });
      }
    }

    return ranges;
  }

  private isValueRelevantToRange(
    value: NumericalValue,
    range: NumericalRange
  ): boolean {
    // Check if value is mentioned in context of the range
    const distance = Math.abs(
      value.location.start - range.location.start
    );
    return distance < 100; // Within 100 characters
  }

  private shouldSumToHundred(
    percentages: NumericalValue[],
    text: string
  ): boolean {
    // Look for indicators that these percentages should sum to 100%
    const indicators = [
      'breakdown',
      'distribution',
      'allocation',
      'composition',
      'split',
    ];
    const context = percentages
      .map((p) => p.context)
      .join(' ')
      .toLowerCase();

    return indicators.some((indicator) =>
      context.includes(indicator)
    );
  }

  private calculateSeverityForCalculationError(
    expected: number,
    actual: number
  ): IssueSeverity {
    const percentError =
      Math.abs((expected - actual) / expected) * 100;

    if (percentError > 50) return 'critical';
    if (percentError > 20) return 'high';
    if (percentError > 5) return 'medium';
    return 'low';
  }

  private calculateSeverityForRangeViolation(
    value: number,
    range: NumericalRange
  ): IssueSeverity {
    const rangeSize = range.max - range.min;
    const violation = Math.min(
      Math.abs(value - range.min),
      Math.abs(value - range.max)
    );

    const violationPercent = (violation / rangeSize) * 100;

    if (violationPercent > 100) return 'critical';
    if (violationPercent > 50) return 'high';
    if (violationPercent > 20) return 'medium';
    return 'low';
  }

  private calculateSeverityForSumMismatch(
    expected: number,
    actual: number
  ): IssueSeverity {
    const percentError =
      Math.abs((expected - actual) / expected) * 100;

    if (percentError > 25) return 'high';
    if (percentError > 10) return 'medium';
    return 'low';
  }

  private getLineNumber(text: string, position: number): number {
    return text.substring(0, position).split('\n').length;
  }

  private getColumnNumber(text: string, position: number): number {
    const lines = text.substring(0, position).split('\n');
    return lines[lines.length - 1].length + 1;
  }
}
