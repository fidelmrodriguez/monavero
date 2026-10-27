import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
const THEME_KEY = 'monavero-theme';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly mode = signal<ThemeMode>(this.restoreTheme());

  constructor() {
    effect(() => {
      const mode = this.mode();
      this.document.body.classList.toggle('dark-theme', mode === 'dark');
      if (this.isBrowser) {
        localStorage.setItem(THEME_KEY, mode);
      }
    });
  }

  toggle(): void {
    this.mode.update((mode) => mode === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private restoreTheme(): ThemeMode {
    if (!this.isBrowser) {
      return 'light';
    }

    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }
}
