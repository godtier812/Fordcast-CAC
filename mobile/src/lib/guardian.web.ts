/** Guardian mode needs a phone; on the website we point people to the Chrome extension instead. */
export {
  HAZARD_CACHE_KEY,
  RETENTION_MAX_AGE_MS,
  activeCachedHazards,
  buildGuardianHazardsFromStatuses,
  extractSourceEvidence,
  hasSource,
  upsertHazardSource,
  type GuardianCache,
  type HazardSourceTag,
  type SourceEvidence,
  type TaggedHazard,
} from './guardian-cache';

export const GUARDIAN_TASK = 'fordcast-guardian';
export type GuardianResult = 'started' | 'stopped' | 'unsupported' | 'denied';
export const guardianSupported = () => false;
export const guardianRunning = async () => false;
export const startGuardian = async (): Promise<GuardianResult> => 'unsupported';
export const stopGuardian = async (): Promise<GuardianResult> => 'stopped';
