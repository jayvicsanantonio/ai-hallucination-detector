import { ParsedContent } from '@/models/core/ParsedContent';
import { Issue } from '@/models/core/VerificationResult';
import { FinancialData, Calculation } from './FinancialModule';

export class CalculationVerifier {
  private readonly PRECISION_TOLERANCE = 0.01;

  async verifyCalculations(
    content: ParsedContent,
    financialData: FinancialData[]
  ): Promise<Issue[]> {
    const issues: Issue[] = [];
    const text = content.extractedText;

    // Extract and verify calculations
    const calculations = this.extractCalculations(text);

    for (const calculation of calculations) {
      const verificationResult = this.verifyCalculation(calculation);
      if (!verificationResult.isValid) {
        issues.push({
          id: `calculation-error-${calculation.id}`,
          type: 'factual_error',
          severity: 'high',
          location: calculation.location,
          description:
            verificationResult.error ||
            'Calculation verification failed',
          evidence: [
            `Expression: ${calculation.expression}`,
            `Expected: ${calculation.expectedResult}`,
            `Actual: ${calculation.result}`,
          ],
          confidence: 95,
          moduleSource: 'calculation-verifier',
        });
      }
    }

    // Verify financial ratios
    issues.push(...this.verifyFinancialRatios(financialData));

    // Verify percentage calculations
    issues.push(...this.verifyPercentageCalculations(text));

    // Verify compound calculations
    issues.push(...this.verifyCompoundCalculations(text));

    return issues;
  }

  private extractCalculations(text: string): Calculation[] {
    const calculations: Calculation[] = [];

    // Pattern for simple arithmetic: number operator number = result
    const simpleArithmeticPattern =
      /(\$?[\d,]+(?:\.\d{2})?)\s*([+\-*/])\s*(\$?[\d,]+(?:\.\d{2})?)\s*=\s*(\$?[\d,]+(?:\.\d{2})?)/g;

    let match;
    while ((match = simpleArithmeticPattern.exec(text)) !== null) {
      const [fullMatch, operand1, operator, operand2, result] = match;

      calculations.push({
        id: `calc-${calculations.length}`,
        expression: `${operand1} ${operator} ${operand2}`,
        result: this.parseNumber(result),
        expectedResult: this.calculateExpectedResult(
          this.parseNumber(operand1),
          operator,
          this.parseNumber(operand2)
        ),
        location: {
          start: match.index!,
          end: match.index! + fullMatch.length,
        },
        isValid: false, // Will be determined by verification
      });
    }

    // Pattern for percentage calculations: number * percentage = result
    const percentagePattern =
      /(\$?[\d,]+(?:\.\d{2})?)\s*\*\s*(\d+(?:\.\d+)?%)\s*=\s*(\$?[\d,]+(?:\.\d{2})?)/g;

    while ((match = percentagePattern.exec(text)) !== null) {
      const [fullMatch, base, percentage, result] = match;

      calculations.push({
        id: `perc-calc-${calculations.length}`,
        expression: `${base} * ${percentage}`,
        result: this.parseNumber(result),
        expectedResult:
          this.parseNumber(base) *
          (this.parsePercentage(percentage) / 100),
        location: {
          start: match.index!,
          end: match.index! + fullMatch.length,
        },
        isValid: false,
      });
    }

    // Pattern for compound interest: P(1+r)^t = result
    const compoundInterestPattern =
      /(\$?[\d,]+(?:\.\d{2})?)\s*\*?\s*\(1\s*\+\s*(\d+(?:\.\d+)?%?)\)\s*\^\s*(\d+)\s*=\s*(\$?[\d,]+(?:\.\d{2})?)/g;

    while ((match = compoundInterestPattern.exec(text)) !== null) {
      const [fullMatch, principal, rate, time, result] = match;

      const rateValue = this.parsePercentage(rate) / 100;
      const expectedResult =
        this.parseNumber(principal) *
        Math.pow(1 + rateValue, parseInt(time));

      calculations.push({
        id: `compound-${calculations.length}`,
        expression: `${principal} * (1 + ${rate})^${time}`,
        result: this.parseNumber(result),
        expectedResult,
        location: {
          start: match.index!,
          end: match.index! + fullMatch.length,
        },
        isValid: false,
      });
    }

    return calculations;
  }

  private verifyCalculation(calculation: Calculation): {
    isValid: boolean;
    error?: string;
  } {
    if (calculation.expectedResult === undefined) {
      return { isValid: true }; // Cannot verify without expected result
    }

    const difference = Math.abs(
      calculation.result - calculation.expectedResult
    );

    if (difference > this.PRECISION_TOLERANCE) {
      return {
        isValid: false,
        error: `Calculation result differs by ${difference.toFixed(
          4
        )} from expected value`,
      };
    }

    return { isValid: true };
  }

  private verifyFinancialRatios(
    financialData: FinancialData[]
  ): Issue[] {
    const issues: Issue[] = [];
    const ratios = financialData.filter(
      (d) => d.type === 'financial_ratio'
    );

    // Common financial ratio validations
    for (const ratio of ratios) {
      // Check for impossible ratios
      if (
        ratio.numericValue < 0 &&
        ratio.value.toLowerCase().includes('ratio')
      ) {
        issues.push({
          id: `invalid-ratio-${ratio.id}`,
          type: 'factual_error',
          severity: 'medium',
          location: ratio.location,
          description: 'Financial ratio cannot be negative',
          evidence: [ratio.value],
          confidence: 90,
          moduleSource: 'calculation-verifier',
        });
      }

      // Check for extremely high ratios that might indicate calculation errors
      if (ratio.numericValue > 1000) {
        issues.push({
          id: `extreme-ratio-${ratio.id}`,
          type: 'factual_error',
          severity: 'low',
          location: ratio.location,
          description:
            'Extremely high ratio value - please verify calculation',
          evidence: [ratio.value],
          confidence: 70,
          moduleSource: 'calculation-verifier',
        });
      }
    }

    return issues;
  }

  private verifyPercentageCalculations(text: string): Issue[] {
    const issues: Issue[] = [];

    // Look for percentage change calculations
    const percentageChangePattern =
      /\((\$?[\d,]+(?:\.\d{2})?)\s*-\s*(\$?[\d,]+(?:\.\d{2})?)\)\s*\/\s*(\$?[\d,]+(?:\.\d{2})?)\s*\*\s*100\s*=\s*(\d+(?:\.\d+)?%?)/g;

    let match;
    while ((match = percentageChangePattern.exec(text)) !== null) {
      const [fullMatch, newValue, oldValue, baseValue, result] =
        match;

      const newVal = this.parseNumber(newValue);
      const oldVal = this.parseNumber(oldValue);
      const baseVal = this.parseNumber(baseValue);
      const actualResult = this.parsePercentage(result);

      const expectedResult = ((newVal - oldVal) / baseVal) * 100;

      if (Math.abs(actualResult - expectedResult) > 0.1) {
        // 0.1% tolerance
        issues.push({
          id: `percentage-calc-error-${Date.now()}`,
          type: 'factual_error',
          severity: 'high',
          location: {
            start: match.index!,
            end: match.index! + fullMatch.length,
            line: 1,
            column: 1,
          },
          description: 'Percentage change calculation is incorrect',
          evidence: [
            `Expression: ${fullMatch}`,
            `Expected: ${expectedResult.toFixed(2)}%`,
            `Actual: ${actualResult.toFixed(2)}%`,
          ],
          confidence: 95,
          moduleSource: 'calculation-verifier',
        });
      }
    }

    return issues;
  }

  private verifyCompoundCalculations(text: string): Issue[] {
    const issues: Issue[] = [];

    // Look for present value calculations: FV / (1+r)^t = PV
    const presentValuePattern =
      /(\$?[\d,]+(?:\.\d{2})?)\s*\/\s*\(1\s*\+\s*(\d+(?:\.\d+)?%?)\)\s*\^\s*(\d+)\s*=\s*(\$?[\d,]+(?:\.\d{2})?)/g;

    let match;
    while ((match = presentValuePattern.exec(text)) !== null) {
      const [fullMatch, futureValue, rate, time, presentValue] =
        match;

      const fv = this.parseNumber(futureValue);
      const r = this.parsePercentage(rate) / 100;
      const t = parseInt(time);
      const actualPV = this.parseNumber(presentValue);

      const expectedPV = fv / Math.pow(1 + r, t);

      if (
        Math.abs(actualPV - expectedPV) > this.PRECISION_TOLERANCE
      ) {
        issues.push({
          id: `pv-calc-error-${Date.now()}`,
          type: 'factual_error',
          severity: 'high',
          location: {
            start: match.index!,
            end: match.index! + fullMatch.length,
            line: 1,
            column: 1,
          },
          description: 'Present value calculation is incorrect',
          evidence: [
            `Expression: ${fullMatch}`,
            `Expected: $${expectedPV.toFixed(2)}`,
            `Actual: $${actualPV.toFixed(2)}`,
          ],
          confidence: 95,
          moduleSource: 'calculation-verifier',
        });
      }
    }

    return issues;
  }

  private calculateExpectedResult(
    operand1: number,
    operator: string,
    operand2: number
  ): number {
    switch (operator) {
      case '+':
        return operand1 + operand2;
      case '-':
        return operand1 - operand2;
      case '*':
        return operand1 * operand2;
      case '/':
        return operand2 !== 0 ? operand1 / operand2 : NaN;
      default:
        return NaN;
    }
  }

  private parseNumber(value: string): number {
    return parseFloat(value.replace(/[$,]/g, ''));
  }

  private parsePercentage(value: string): number {
    return parseFloat(value.replace('%', ''));
  }
}
