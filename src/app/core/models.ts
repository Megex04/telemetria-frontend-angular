/** Contrato del backend (OpenAPI + eventos Socket.IO del namespace `/telemetry`). */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface TelemetryReading {
  id: string;
  deviceId: string;
  /** Momento de la medición reportado por el dispositivo (ISO 8601). */
  timestamp: string;
  /** Hora del servidor al aceptar la lectura (ISO 8601). */
  receivedAt: string;
  metrics: Record<string, number>;
  location?: GeoPoint;
}

export type AlertSeverity = 'warning' | 'critical';

export interface TelemetryAlert {
  id: string;
  deviceId: string;
  readingId: string;
  metric: string;
  value: number;
  /** Se dispara cuando value < min. */
  min?: number;
  /** Se dispara cuando value > max. */
  max?: number;
  severity: AlertSeverity;
  timestamp: string;
}

export type DeviceStatus = 'online' | 'offline';

export interface DeviceState {
  deviceId: string;
  status: DeviceStatus;
  firstSeen: string;
  lastSeen: string;
  readingCount: number;
  latest: TelemetryReading;
}

/** Evento `device:status`. */
export interface DeviceStatusEvent {
  deviceId: string;
  status: DeviceStatus;
  lastSeen: string;
}

/** Ack de `telemetry:subscribe`. */
export type SubscribeAck =
  | { ok: true; room: string; latest: TelemetryReading | null }
  | { ok: false; error: { message: string; details?: string[] } };

export interface Threshold {
  min?: number;
  max?: number;
  severity: AlertSeverity;
}

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'unauthorized';
