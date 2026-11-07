import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { formatValue, metricMeta } from '../../core/metrics';
import { TelemetryReading, Threshold } from '../../core/models';
import { Theme, ThemeService } from '../../core/theme';

Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Filler);

type Point = { x: number; y: number };


/** Gráfico de línea en vivo de una métrica; la ventana de tiempo se desliza cada segundo. */
@Component({
  selector: 'app-metric-chart',
  templateUrl: './metric-chart.html',
  styleUrl: './metric-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricChart {
  readonly metric = input.required<string>();
  readonly readings = input.required<readonly TelemetryReading[]>();
  readonly windowSeconds = input.required<number>();
  readonly threshold = input<Threshold>();
  readonly color = input('#38bdf8');

  protected readonly meta = computed(() => metricMeta(this.metric()));
  protected readonly hasData = signal(false);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly themeService = inject(ThemeService);
  private chart?: Chart<'line', Point[]>;
  private frame = 0;
  private appliedTheme?: Theme;
  private severityColor = { warning: '', critical: '' };

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.chart = this.createChart();
      this.sync();
      const timer = setInterval(() => this.sync(), 1000); // desliza la ventana aunque no lleguen datos
      destroyRef.onDestroy(() => {
        clearInterval(timer);
        cancelAnimationFrame(this.frame);
        this.chart?.destroy();
      });
    });

    effect(() => {
      this.metric();
      this.readings();
      this.windowSeconds();
      this.threshold();
      this.color();
      this.themeService.theme();
      if (this.chart) this.schedule();
    });
  }

  private schedule() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.sync());
  }

  private createChart() {
    const line = (color: string, dashed = false) => ({
      data: [] as Point[],
      borderColor: color,
      borderWidth: dashed ? 1.25 : 2,
      borderDash: dashed ? [6, 4] : [],
      pointRadius: 0,
      pointHoverRadius: dashed ? 0 : 4,
      tension: 0.25,
    });

    return new Chart<'line', Point[]>(this.canvas().nativeElement, {
      type: 'line',
      data: {
        datasets: [
          { ...line(this.color()), fill: true, backgroundColor: this.color() + '22' },
          line('#f87171', true), // umbral máximo
          line('#f87171', true), // umbral mínimo
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        normalized: true,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: {
            type: 'time',
            time: { displayFormats: { second: 'HH:mm:ss', minute: 'HH:mm', hour: 'HH:mm' } },
            ticks: { maxRotation: 0, autoSkipPadding: 24, maxTicksLimit: 6 },
            border: { display: false },
          },
          y: {
            grace: '10%',
            ticks: { maxTicksLimit: 6, includeBounds: false },
            border: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item) => item.datasetIndex === 0,
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              title: (items) => new Date(items[0].parsed.x ?? 0).toLocaleTimeString('es'),
              label: (item) => `${formatValue(item.parsed.y)} ${this.meta().unit}`.trim(),
            },
          },
        },
      },
    });
  }

  /**
   * Rango del eje Y ajustado a los datos. Un umbral solo lo ensancha si está cerca de la serie;
   * si no, quedaría la línea de datos aplastada contra un límite lejano.
   */
  private yRange(points: Point[], limits: (number | undefined)[]) {
    if (!points.length) return undefined;
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of points) {
      lo = Math.min(lo, p.y);
      hi = Math.max(hi, p.y);
    }
    const span = Math.max(hi - lo, Math.abs(hi) * 0.05, 1);
    const [dataLo, dataHi] = [lo, hi];
    for (const limit of limits) {
      if (limit !== undefined && limit >= dataLo - 2 * span && limit <= dataHi + 2 * span) {
        lo = Math.min(lo, limit);
        hi = Math.max(hi, limit);
      }
    }
    const pad = (hi - lo || 1) * 0.1;
    return { min: lo - pad, max: hi + pad };
  }

  /** Toma los colores de las variables CSS del tema activo (solo cuando el tema cambia). */
  private applyTheme(chart: Chart<'line', Point[]>) {
    const theme = this.themeService.theme();
    if (theme === this.appliedTheme) return;
    this.appliedTheme = theme;

    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    const grid = v('--chart-grid');
    const muted = v('--text-muted');
    this.severityColor = { warning: v('--warning'), critical: v('--critical') };

    const { x, y } = chart.options.scales ?? {};
    for (const scale of [x, y]) {
      if (!scale) continue;
      scale.grid = { ...scale.grid, color: grid };
      scale.ticks = { ...scale.ticks, color: muted };
    }
    const tooltip = chart.options.plugins?.tooltip;
    if (tooltip) {
      tooltip.backgroundColor = v('--surface');
      tooltip.borderColor = v('--border-strong');
      tooltip.titleColor = muted;
      tooltip.bodyColor = v('--text');
    }
  }

  private sync() {
    const chart = this.chart;
    if (!chart) return;
    this.applyTheme(chart);

    const metric = this.metric();
    const list = this.readings();
    // Si el reloj del dispositivo va adelantado, la ventana se ancla a la última muestra.
    const lastX = list.length ? Date.parse(list[list.length - 1].timestamp) : 0;
    const end = Math.max(Date.now(), lastX);
    const start = end - this.windowSeconds() * 1000;

    // `list` está ordenada por timestamp: se recorre desde el final hasta salir de la ventana.
    const points: Point[] = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const y = list[i].metrics[metric];
      if (typeof y !== 'number') continue;
      const x = Date.parse(list[i].timestamp);
      points.push({ x, y });
      if (x < start) break; // conserva una muestra previa para que la línea entre desde el borde
    }
    points.reverse();

    const color = this.color();
    const [main, max, min] = chart.data.datasets;
    main.data = points;
    main.borderColor = color;
    main.backgroundColor = color + '22';

    const t = this.threshold();
    const limitLine = (value: number | undefined): Point[] =>
      value === undefined ? [] : [{ x: start, y: value }, { x: end, y: value }];
    max.data = limitLine(t?.max);
    min.data = limitLine(t?.min);
    const limitColor = this.severityColor[t?.severity ?? 'critical'];
    max.borderColor = min.borderColor = limitColor;

    const x = chart.options.scales?.['x'];
    if (x) {
      x.min = start;
      x.max = end;
    }
    const y = chart.options.scales?.['y'];
    if (y) {
      const range = this.yRange(points, [t?.min, t?.max]);
      y.min = range?.min;
      y.max = range?.max;
    }
    chart.update('none');
    this.hasData.set(points.length > 0);
  }
}
