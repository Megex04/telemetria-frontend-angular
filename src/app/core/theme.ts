import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/** Tema claro/oscuro: respeta el del sistema hasta que el usuario elige uno, y lo recuerda. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.initial());

  toggle() {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    // Se aplica de forma síncrona: los gráficos leen las variables CSS al reaccionar al cambio.
    document.documentElement.dataset['theme'] = next;
    this.theme.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* almacenamiento no disponible: el tema solo dura la sesión */
    }
  }

  private initial(): Theme {
    const applied = document.documentElement.dataset['theme']; // lo fija el script de index.html
    if (applied === 'light' || applied === 'dark') return applied;
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
}
