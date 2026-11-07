import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatValue, metricMeta } from '../../core/metrics';
import { Threshold } from '../../core/models';

/** Valor actual de una métrica con tendencia respecto a la lectura anterior. */
@Component({
  selector: 'app-metric-card',
  templateUrl: './metric-card.html',
  styleUrl: './metric-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCard {
  readonly metric = input.required<string>();
  readonly value = input<number>();
  readonly previous = input<number>();
  readonly threshold = input<Threshold>();
  readonly color = input('#38bdf8');

  protected readonly meta = computed(() => metricMeta(this.metric()));
  protected readonly text = computed(() => formatValue(this.value()));
  protected readonly delta = computed(() => {
    const value = this.value();
    const previous = this.previous();
    if (value === undefined || previous === undefined) return null;
    const diff = value - previous;
    return { diff, text: `${diff > 0 ? '+' : ''}${formatValue(diff)}` };
  });
  /** Fuera de rango según el último umbral conocido de la métrica. */
  protected readonly breach = computed(() => {
    const value = this.value();
    const t = this.threshold();
    if (value === undefined || !t) return null;
    const out = (t.max !== undefined && value > t.max) || (t.min !== undefined && value < t.min);
    return out ? t.severity : null;
  });
}
