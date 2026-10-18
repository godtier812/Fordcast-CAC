// mobile/src/demo/engine/baseline-rule.ts ★ — student-owned (§1.8 #1). Contract: §23.1 step 2; worked example: §23.3.
import type { Crossing, Gauge, Link, Reading, RuleResult } from './types';
export function evaluate(c: Crossing, links: Link[], series: Map<string, Reading[]>, gauges: Map<string, Gauge>,
  asOf: number): RuleResult {
  throw new Error('TODO(student)');
}
