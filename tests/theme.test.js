import { describe, it, expect, beforeEach, vi } from 'vitest';

async function loadTheme({ autoInit = false } = {}) {
  if (autoInit) {
    delete globalThis.__NEURO_THEME_NO_AUTOINIT;
  } else {
    globalThis.__NEURO_THEME_NO_AUTOINIT = true;
  }
  vi.resetModules();
  const mod = await import('../assets/theme.js');
  return mod.default || globalThis.NeuroTheme;
}

function fakeWindow({ saved = null, prefersDark = false } = {}) {
  return {
    localStorage: { getItem: vi.fn(() => saved) },
    matchMedia: vi.fn(() => ({ matches: prefersDark }))
  };
}

describe('resolveTheme', () => {
  it('prefers the stored theme over the OS preference', async () => {
    const { resolveTheme } = await loadTheme();
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('falls back to the OS preference when nothing is stored', async () => {
    const { resolveTheme } = await loadTheme();
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
    expect(resolveTheme('', true)).toBe('dark');
  });
});

describe('applyStoredTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    // jsdom does not implement matchMedia.
    window.matchMedia = vi.fn(() => ({ matches: false }));
  });

  it('reads the documented storage key and media query', async () => {
    const theme = await loadTheme();
    const win = fakeWindow({ saved: 'dark' });
    const doc = { documentElement: { setAttribute: vi.fn() } };

    expect(theme.applyStoredTheme(win, doc)).toBe('dark');
    expect(win.localStorage.getItem).toHaveBeenCalledWith('neuro_theme');
    expect(win.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(doc.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('resolves dark from the media query when storage is empty', async () => {
    const theme = await loadTheme();
    const doc = { documentElement: { setAttribute: vi.fn() } };

    expect(theme.applyStoredTheme(fakeWindow({ prefersDark: true }), doc)).toBe('dark');
    expect(theme.applyStoredTheme(fakeWindow({ prefersDark: false }), doc)).toBe('light');
  });

  it('writes data-theme onto the real document element', async () => {
    const theme = await loadTheme();
    localStorage.setItem('neuro_theme', 'light');

    theme.applyStoredTheme(window, document);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applies the theme automatically when the script loads in a document', async () => {
    localStorage.setItem('neuro_theme', 'dark');

    await loadTheme({ autoInit: true });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
