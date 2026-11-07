import { TelemetryReading } from './models';

export const MAX_READINGS = 1000;

const time = (r: TelemetryReading) => Date.parse(r.timestamp);

/**
 * Mezcla lecturas (backfill REST + eventos en vivo) sin duplicar por `id`,
 * ordenadas por `timestamp` ascendente y acotadas a `max`.
 */
export function mergeReadings(
  current: readonly TelemetryReading[],
  incoming: readonly TelemetryReading[],
  max = MAX_READINGS,
): TelemetryReading[] {
  const byId = new Map<string, TelemetryReading>();
  for (const r of current) byId.set(r.id, r);
  for (const r of incoming) byId.set(r.id, r);
  const merged = [...byId.values()].sort((a, b) => time(a) - time(b));
  return merged.length > max ? merged.slice(-max) : merged;
}
