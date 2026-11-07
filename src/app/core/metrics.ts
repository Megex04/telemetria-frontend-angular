import { TelemetryReading } from './models';

interface MetricMeta {
  label: string;
  unit: string;
}

/** Métricas conocidas, en el orden en que se muestran. Las demás van después, alfabéticamente. */
const KNOWN: Record<string, MetricMeta> = {
  temperature: { label: 'Temperatura', unit: '°C' },
  humidity: { label: 'Humedad', unit: '%' },
  battery: { label: 'Batería', unit: '%' },
  pressure: { label: 'Presión', unit: 'hPa' },
  voltage: { label: 'Voltaje', unit: 'V' },
  current: { label: 'Corriente', unit: 'A' },
  speed: { label: 'Velocidad', unit: 'km/h' },
  rssi: { label: 'Señal', unit: 'dBm' },
};
const KNOWN_ORDER = Object.keys(KNOWN);

/** Colores de serie por tema: en claro son más oscuros para mantener contraste sobre blanco. */
export const METRIC_COLORS = {
  dark: ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#fb923c'],
  light: ['#0284c7', '#7c3aed', '#059669', '#d97706', '#db2777', '#ea580c'],
} as const;

const humanize = (key: string): string => {
  const spaced = key.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export function metricMeta(key: string): MetricMeta {
  return KNOWN[key] ?? { label: humanize(key), unit: '' };
}

export function sortMetrics(keys: Iterable<string>): string[] {
  const rank = (k: string) => {
    const i = KNOWN_ORDER.indexOf(k);
    return i === -1 ? KNOWN_ORDER.length : i;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function formatValue(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('es', { maximumFractionDigits: 2 });
}

/** Nombres de métrica presentes en las últimas lecturas, en orden de visualización. */
export function metricNames(readings: readonly TelemetryReading[], sample = 20): string[] {
  const keys = new Set<string>();
  for (const r of readings.slice(-sample)) for (const k of Object.keys(r.metrics)) keys.add(k);
  return sortMetrics(keys);
}

export function formatAgo(fromIso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(fromIso)) / 1000));
  if (seconds < 2) return 'ahora';
  if (seconds < 60) return `hace ${seconds} s`;
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return `hace ${Math.floor(seconds / 86400)} d`;
}
