import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { METRIC_COLORS, formatAgo, metricNames } from '../../core/metrics';
import { TelemetryStore } from '../../core/telemetry-store';
import { ThemeService } from '../../core/theme';
import { MetricCard } from '../metric-card/metric-card';
import { MetricChart } from '../metric-chart/metric-chart';

const WINDOWS = [
  { label: '1 min', seconds: 60 },
  { label: '5 min', seconds: 300 },
  { label: '15 min', seconds: 900 },
];

@Component({
  selector: 'app-device-dashboard',
  imports: [MetricCard, MetricChart],
  templateUrl: './device-dashboard.html',
  styleUrl: './device-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceDashboard {
  protected readonly store = inject(TelemetryStore);
  private readonly theme = inject(ThemeService);
  protected readonly windows = WINDOWS;
  protected readonly ago = formatAgo;

  /** Una entrada por métrica con su valor actual y el anterior (para la tendencia). */
  protected readonly metrics = computed(() => {
    const readings = this.store.readings();
    const palette = METRIC_COLORS[this.theme.theme()];
    return metricNames(readings).map((metric, i) => {
      const values: number[] = [];
      for (let j = readings.length - 1; j >= 0 && values.length < 2; j--) {
        const v = readings[j].metrics[metric];
        if (typeof v === 'number') values.push(v);
      }
      return {
        metric,
        color: palette[i % palette.length],
        value: values[0],
        previous: values[1],
      };
    });
  });
}
