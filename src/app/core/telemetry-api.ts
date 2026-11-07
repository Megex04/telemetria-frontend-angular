import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { DeviceState, TelemetryAlert, TelemetryReading } from './models';

@Injectable({ providedIn: 'root' })
export class TelemetryApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  devices() {
    return this.http.get<DeviceState[]>(`${this.base}/devices`);
  }

  /** Más reciente primero. `limit` 1–500. */
  readings(deviceId: string, limit = 500) {
    const params = new HttpParams().set('deviceId', deviceId).set('limit', limit);
    return this.http.get<TelemetryReading[]>(`${this.base}/telemetry`, { params });
  }

  /** Más reciente primero. `limit` 1–500. */
  alerts(limit = 50) {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<TelemetryAlert[]>(`${this.base}/alerts`, { params });
  }
}
