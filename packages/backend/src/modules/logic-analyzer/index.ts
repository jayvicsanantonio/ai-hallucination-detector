export { LogicAnalyzer } from './LogicAnalyzer';
export { ContradictionDetector } from './ContradictionDetector';
export { LogicalFallacyDetector } from './LogicalFallacyDetector';
export { NumericalConsistencyChecker } from './NumericalConsistencyChecker';
export { CoherenceValidator } from './CoherenceValidator';

export type {
  LogicAnalysisResult,
  Contradiction,
  LogicalFallacy,
  NumericalInconsistency,
} from './LogicAnalyzer';

export type { Statement } from './ContradictionDetector';

export type { FallacyPattern } from './LogicalFallacyDetector';

export type {
  NumericalValue,
  Calculation,
  NumericalRange,
} from './NumericalConsistencyChecker';

export type {
  CoherenceIssue,
  TemporalEvent,
  CausalRelation,
  CrossReference,
} from './CoherenceValidator';
