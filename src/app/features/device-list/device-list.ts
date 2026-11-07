import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { formatAgo, formatValue, metricMeta, sortMetrics } from '../../core/metrics';
import { DeviceState } from '../../core/models';
import { TelemetryStore } from '../../core/telemetry-store';

@Component({
  selector: 'app-device-list',
  templateUrl: './device-list.html',
  styleUrl: './device-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceList {
  protected readonly store = inject(TelemetryStore);
  protected readonly ago = formatAgo;

  /** Hasta tres métricas de la última lectura, para el resumen de cada fila. */
  protected summary(device: DeviceState) {
    return sortMetrics(Object.keys(device.latest.metrics))
      .slice(0, 3)
      .map((key) => {
        const { unit } = metricMeta(key);
        return `${formatValue(device.latest.metrics[key])}${unit ? ' ' + unit : ''}`;
      })
      .join(' · ');
  }
}
