import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../core/theme';

@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="themeService.toggle()" [attr.aria-label]="label()" [attr.title]="label()">
      @if (themeService.theme() === 'dark') {
        <!-- sol: pasa a modo claro -->
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      } @else {
        <!-- luna: pasa a modo oscuro -->
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      }
    </button>
  `,
  styles: `
    button {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 1px solid var(--border);
      border-radius: 50%;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;

      &:hover {
        color: var(--text);
        background: var(--surface-hover);
      }
    }
  `,
})
export class ThemeToggle {
  protected readonly themeService = inject(ThemeService);
  protected readonly label = computed(() =>
    this.themeService.theme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
  );
}
