import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ConnectionState } from '../../core/models';
import { TelemetryStore } from '../../core/telemetry-store';

const LABELS: Record<ConnectionState, string> = {
  connecting: 'Conectando…',
  connected: 'En vivo',
  reconnecting: 'Reconectando…',
  unauthorized: 'No autorizado',
};

@Component({
  selector: 'app-connection-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="dot" [attr.data-state]="state()"></span>{{ label() }}`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border: 1px solid var(--border);
      border-radius: 999px;
      font-size: 0.8125rem;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--warning);
    }
    .dot[data-state='connected'] {
      background: var(--ok);
      box-shadow: 0 0 0 0 var(--ok);
      animation: pulse 2s infinite;
    }
    .dot[data-state='unauthorized'] {
      background: var(--critical);
    }
    @keyframes pulse {
      70% {
        box-shadow: 0 0 0 6px transparent;
      }
      100% {
        box-shadow: 0 0 0 0 transparent;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .dot {
        animation: none !important;
      }
    }
  `,
})
export class ConnectionBadge {
  private readonly store = inject(TelemetryStore);
  protected readonly state = this.store.connection;
  protected readonly label = computed(() => LABELS[this.state()]);
}
