import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { formatAgo, formatValue, metricMeta } from '../../core/metrics';
import { TelemetryAlert } from '../../core/models';
import { TelemetryStore } from '../../core/telemetry-store';

@Component({
  selector: 'app-alert-feed',
  templateUrl: './alert-feed.html',
  styleUrl: './alert-feed.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertFeed {
  protected readonly store = inject(TelemetryStore);
  protected readonly ago = formatAgo;
  protected readonly label = (metric: string) => metricMeta(metric).label;

  /** Ej.: "91,2 °C > 80" o "12 % < 15". */
  protected describe(alert: TelemetryAlert): string {
    const { unit } = metricMeta(alert.metric);
    const value = `${formatValue(alert.value)}${unit ? ' ' + unit : ''}`;
    if (alert.max !== undefined && alert.value > alert.max) return `${value} > ${formatValue(alert.max)}`;
    if (alert.min !== undefined && alert.value < alert.min) return `${value} < ${formatValue(alert.min)}`;
    return value;
  }
}
