/* ==========================================================================
   1. Theme Bootstrap (Q6 Lock)
   ========================================================================== */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.NeuroTheme = api;
    if (typeof document !== 'undefined' && typeof window !== 'undefined' && !root.__NEURO_THEME_NO_AUTOINIT) {
        api.applyStoredTheme(window, document);
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    var STORAGE_KEY = 'neuro_theme';
    var DARK_QUERY = '(prefers-color-scheme: dark)';

    function resolveTheme(savedTheme, prefersDark) {
        if (savedTheme) return savedTheme;
        return prefersDark ? 'dark' : 'light';
    }

    function applyStoredTheme(win, doc) {
        var savedTheme = win.localStorage.getItem(STORAGE_KEY);
        var prefersDark = win.matchMedia(DARK_QUERY).matches;
        var theme = resolveTheme(savedTheme, prefersDark);
        doc.documentElement.setAttribute('data-theme', theme);
        return theme;
    }

    return {
        STORAGE_KEY: STORAGE_KEY,
        DARK_QUERY: DARK_QUERY,
        resolveTheme: resolveTheme,
        applyStoredTheme: applyStoredTheme
    };
});
