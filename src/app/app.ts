import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TelemetryStore } from './core/telemetry-store';
import { AlertFeed } from './features/alert-feed/alert-feed';
import { ConnectionBadge } from './features/connection-badge/connection-badge';
import { DeviceDashboard } from './features/device-dashboard/device-dashboard';
import { DeviceList } from './features/device-list/device-list';
import { ThemeToggle } from './features/theme-toggle/theme-toggle';

@Component({
  selector: 'app-root',
  imports: [AlertFeed, ConnectionBadge, DeviceDashboard, DeviceList, ThemeToggle],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly store = inject(TelemetryStore);
}
