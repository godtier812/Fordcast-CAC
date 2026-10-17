import { z } from 'zod';
export const states = ['no_rise', 'unknown', 'watch', 'avoid', 'closed'] as const;
export type RiskState = (typeof states)[number];
export const rank: Record<RiskState, number> = {
  no_rise: 0,
  unknown: 1,
  watch: 2,
  avoid: 3,
  closed: 4,
};
export const allowedWindows = ['0,15', '15,30', '30,60', '60,90', '0,30', '15,60', '30,90'];
const iso = z.string().datetime({ offset: true });
export const RiskSchema = z
  .object({
    id: z.string(),
    state: z.enum(states),
    tier: z.enum(['A', 'B', 'C']),
    window: z.tuple([z.number(), z.number()]).nullable(),
    held: z.boolean(),
    p: z.tuple([z.number(), z.number(), z.number()]).nullable(),
    official: z.record(z.string(), z.unknown()).nullable(),
    closed_source: z.string().nullable(),
    latest_obs_at: iso.nullable(),
    changed_at: iso.nullable(),
    last_known: z.object({ state: z.enum(states), at: iso }).nullable(),
    reasons: z.array(z.object({ code: z.string() }).passthrough()),
  })
  .superRefine((value, ctx) => {
    if (value.state !== 'no_rise' && value.reasons.length === 0)
      ctx.addIssue({ code: 'custom', message: 'Missing reason' });
    if (
      value.window &&
      (!allowedWindows.includes(value.window.join(',')) ||
        !['watch', 'avoid'].includes(value.state))
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid risk window' });
  });
export type Risk = z.infer<typeof RiskSchema>;
export function unknownRisk(id: string): Risk {
  return {
    id,
    state: 'unknown',
    tier: 'C',
    window: null,
    held: false,
    p: null,
    official: null,
    closed_source: null,
    latest_obs_at: null,
    changed_at: null,
    last_known: null,
    reasons: [{ code: 'DATA_STALE', source: 'snapshot' }],
  };
}
export function parseRisk(value: unknown, id: string): Risk {
  const parsed = RiskSchema.safeParse(value);
  return parsed.success && parsed.data.id === id ? parsed.data : unknownRisk(id);
}
export function effectiveRisk(risk: Risk, asOf: string, dataStatus: string, now: number): Risk {
  const timestamp = Date.parse(asOf);
  if (
    !Number.isFinite(timestamp) ||
    timestamp > now + 60000 ||
    now - timestamp > 1200000 ||
    dataStatus === 'offline'
  ) {
    return {
      ...unknownRisk(risk.id),
      tier: risk.tier,
      last_known:
        iso.safeParse(asOf).success &&
        timestamp <= now + 60000 &&
        ['watch', 'avoid', 'closed'].includes(risk.state)
          ? { state: risk.state, at: asOf }
          : risk.last_known,
    };
  }
  return risk;
}
