import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../environments/environment';
import {
  ConnectionState,
  DeviceState,
  DeviceStatusEvent,
  SubscribeAck,
  TelemetryAlert,
  TelemetryReading,
  Threshold,
} from './models';
import { MAX_READINGS, mergeReadings } from './readings';
import { TelemetryApi } from './telemetry-api';

const MAX_ALERTS = 100;
const BACKFILL = 500;

/**
 * Estado de la app: conexión Socket.IO (`/telemetry`), dispositivos, lecturas del
 * dispositivo seleccionado y alertas. Se suscribe a *todos* los dispositivos y
 * filtra en el cliente; el historial se completa por REST al seleccionar.
 */
@Injectable({ providedIn: 'root' })
export class TelemetryStore {
  private readonly api = inject(TelemetryApi);
  private socket?: Socket;

  readonly connection = signal<ConnectionState>('connecting');
  readonly error = signal<string | null>(null);
  /** Reloj compartido (1 s) para tiempos relativos y ventana de los gráficos. */
  readonly now = signal(Date.now());
  readonly windowSeconds = signal(300);

  private readonly deviceMap = signal<ReadonlyMap<string, DeviceState>>(new Map());
  readonly devices = computed(() =>
    [...this.deviceMap().values()].sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
  );
  readonly onlineCount = computed(() => this.devices().filter((d) => d.status === 'online').length);

  readonly selectedId = signal<string | null>(null);
  readonly selectedDevice = computed(() => {
    const id = this.selectedId();
    return id ? (this.deviceMap().get(id) ?? null) : null;
  });
  /** Lecturas del dispositivo seleccionado, ordenadas por timestamp ascendente. */
  readonly readings = signal<readonly TelemetryReading[]>([]);

  /** Alertas, la más nueva primero. */
  readonly alerts = signal<readonly TelemetryAlert[]>([]);
  /**
   * Umbrales por métrica, deducidos de las alertas recibidas (el backend no expone
   * sus reglas), por lo que una métrica solo tiene umbral tras su primera alerta.
   */
  readonly thresholds = computed(() => {
    const result: Record<string, Threshold> = {};
    for (const a of this.alerts()) {
      if (a.metric in result || (a.min === undefined && a.max === undefined)) continue;
      result[a.metric] = { min: a.min, max: a.max, severity: a.severity };
    }
    return result;
  });

  constructor() {
    this.connect();
    const tick = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(tick);
      this.socket?.disconnect();
    });
  }

  select(deviceId: string) {
    if (this.selectedId() === deviceId) return;
    this.selectedId.set(deviceId);
    this.readings.set([]);
    void this.loadReadings(deviceId);
  }

  private connect() {
    const socket = io(`${environment.apiUrl}/telemetry`, {
      auth: environment.apiKey ? { apiKey: environment.apiKey } : undefined,
    });
    this.socket = socket;

    // `connect` se emite también en cada reconexión; las salas se pierden, así que se
    // vuelve a suscribir y se recupera lo emitido mientras estuvimos desconectados.
    socket.on('connect', () => {
      this.connection.set('connected');
      this.error.set(null);
      socket.emit('telemetry:subscribe', {}, (ack: SubscribeAck) => {
        if (!ack.ok) this.error.set(`Suscripción rechazada: ${ack.error.message}`);
      });
      void this.refresh();
    });

    socket.on('connect_error', (err) => {
      // El middleware del servidor rechaza con 'unauthorized' y socket.io no reintenta.
      if (err.message === 'unauthorized') {
        this.connection.set('unauthorized');
        this.error.set('API key rechazada por el backend (environment.apiKey).');
      } else {
        this.connection.set(this.connection() === 'connected' ? 'reconnecting' : 'connecting');
      }
    });

    socket.on('disconnect', (reason) => {
      this.connection.set('reconnecting');
      if (reason === 'io server disconnect') socket.connect();
    });

    socket.on('telemetry:reading', (reading: TelemetryReading) => this.onReading(reading));
    socket.on('telemetry:alert', (alert: TelemetryAlert) => this.onAlert(alert));
    socket.on('device:status', (event: DeviceStatusEvent) => this.onStatus(event));
    socket.on('exception', (e: { error?: { message?: string } }) =>
      this.error.set(e.error?.message ?? 'Error del servidor'),
    );
  }

  private async refresh() {
    await Promise.all([this.loadDevices(), this.loadAlerts()]);
    const id = this.selectedId();
    if (id) await this.loadReadings(id);
  }

  private async loadDevices() {
    try {
      const list = await firstValueFrom(this.api.devices());
      this.deviceMap.set(new Map(list.map((d) => [d.deviceId, d])));
      if (!this.selectedId() && list.length) {
        this.select((list.find((d) => d.status === 'online') ?? list[0]).deviceId);
      }
    } catch (e) {
      this.reportHttpError('dispositivos', e);
    }
  }

  private async loadAlerts() {
    try {
      const list = await firstValueFrom(this.api.alerts(MAX_ALERTS));
      // Los eventos en vivo pueden haber llegado antes que la respuesta.
      const known = new Set(list.map((a) => a.id));
      const live = this.alerts().filter((a) => !known.has(a.id));
      this.alerts.set([...live, ...list].slice(0, MAX_ALERTS));
    } catch (e) {
      this.reportHttpError('alertas', e);
    }
  }

  private async loadReadings(deviceId: string) {
    try {
      const rows = await firstValueFrom(this.api.readings(deviceId, BACKFILL));
      if (this.selectedId() !== deviceId) return; // el usuario cambió de dispositivo
      this.readings.update((current) => mergeReadings(current, rows, MAX_READINGS));
    } catch (e) {
      this.reportHttpError('lecturas', e);
    }
  }

  private onReading(reading: TelemetryReading) {
    this.deviceMap.update((map) => {
      const prev = map.get(reading.deviceId);
      const next = new Map(map);
      next.set(reading.deviceId, {
        deviceId: reading.deviceId,
        status: 'online',
        firstSeen: prev?.firstSeen ?? reading.receivedAt,
        lastSeen: reading.receivedAt,
        readingCount: (prev?.readingCount ?? 0) + 1,
        latest: reading,
      });
      return next;
    });

    if (!this.selectedId()) this.select(reading.deviceId);
    else if (reading.deviceId === this.selectedId()) {
      this.readings.update((current) => mergeReadings(current, [reading], MAX_READINGS));
    }
  }

  private onAlert(alert: TelemetryAlert) {
    this.alerts.update((list) => [alert, ...list.filter((a) => a.id !== alert.id)].slice(0, MAX_ALERTS));
  }

  private onStatus(event: DeviceStatusEvent) {
    this.deviceMap.update((map) => {
      const device = map.get(event.deviceId);
      // 'online' llega justo antes de la primera lectura; esa lectura crea el dispositivo.
      if (!device) return map;
      return new Map(map).set(event.deviceId, {
        ...device,
        status: event.status,
        lastSeen: event.lastSeen,
      });
    });
  }

  private reportHttpError(what: string, e: unknown) {
    const status = (e as { status?: number }).status;
    if (status === 401) {
      this.connection.set('unauthorized');
      this.error.set('API key rechazada por el backend (environment.apiKey).');
    } else {
      this.error.set(`No se pudieron cargar ${what}${status ? ` (HTTP ${status})` : ''}.`);
    }
  }
}
