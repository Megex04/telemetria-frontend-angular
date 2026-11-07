import { describe, expect, it } from 'vitest';
import { TelemetryReading } from './models';
import { mergeReadings } from './readings';

const reading = (id: string, timestamp: string): TelemetryReading => ({
  id,
  deviceId: 'sensor-001',
  timestamp,
  receivedAt: timestamp,
  metrics: { temperature: 20 },
});

describe('mergeReadings', () => {
  it('descarta duplicados por id y ordena por timestamp', () => {
    const a = reading('a', '2026-11-01T12:00:00.000Z');
    const b = reading('b', '2026-11-01T12:00:01.000Z');
    const c = reading('c', '2026-11-01T12:00:02.000Z');

    // backfill REST (más nueva primero) + evento en vivo repetido y fuera de orden
    const merged = mergeReadings([c], [b, a, c]);

    expect(merged.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('conserva solo las `max` lecturas más recientes', () => {
    const rows = ['00', '01', '02', '03'].map((s) => reading(s, `2026-11-01T12:00:${s}.000Z`));

    expect(mergeReadings([], rows, 2).map((r) => r.id)).toEqual(['02', '03']);
  });
});
