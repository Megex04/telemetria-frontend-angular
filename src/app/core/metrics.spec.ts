import { describe, expect, it } from 'vitest';
import { formatAgo, formatValue, metricMeta, sortMetrics } from './metrics';

describe('metrics', () => {
  it('ordena primero las métricas conocidas y luego el resto alfabéticamente', () => {
    expect(sortMetrics(['zeta', 'battery', 'alpha', 'temperature'])).toEqual([
      'temperature',
      'battery',
      'alpha',
      'zeta',
    ]);
  });

  it('humaniza métricas desconocidas', () => {
    expect(metricMeta('tank_level')).toEqual({ label: 'Tank level', unit: '' });
    expect(metricMeta('humidity').unit).toBe('%');
  });

  it('formatea valores y tiempos relativos', () => {
    expect(formatValue(undefined)).toBe('—');
    expect(formatValue(23.456)).toBe('23,46');
    const now = Date.parse('2026-11-01T12:01:00.000Z');
    expect(formatAgo('2026-11-01T12:00:57.000Z', now)).toBe('hace 3 s');
    expect(formatAgo('2026-11-01T11:58:00.000Z', now)).toBe('hace 3 min');
  });
});
