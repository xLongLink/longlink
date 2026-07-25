const themeBootstrap = `
(() => {
    const accents = {
        slate: ['#64748b', '#f8fafc'],
        gray: ['#6b7280', '#f8fafc'],
        zinc: ['#71717a', '#f8fafc'],
        neutral: [
            'light-dark(oklch(0.205 0 0), oklch(0.922 0 0))',
            'light-dark(oklch(0.985 0 0), oklch(0.205 0 0))',
        ],
        stone: ['#78716c', '#f8fafc'],
        red: ['#ef4444', '#0f172a'],
        orange: ['#f97316', '#0f172a'],
        amber: ['#f59e0b', '#0f172a'],
        yellow: ['#eab308', '#0f172a'],
        lime: ['#84cc16', '#0f172a'],
        green: ['#22c55e', '#0f172a'],
        emerald: ['#10b981', '#0f172a'],
        teal: ['#14b8a6', '#0f172a'],
        cyan: ['#06b6d4', '#0f172a'],
        sky: ['#0ea5e9', '#0f172a'],
        blue: ['#3b82f6', '#f8fafc'],
        indigo: ['#6366f1', '#f8fafc'],
        violet: ['#8b5cf6', '#f8fafc'],
        purple: ['#a855f7', '#f8fafc'],
        fuchsia: ['#d946ef', '#0f172a'],
        pink: ['#ec4899', '#0f172a'],
        rose: ['#f43f5e', '#0f172a'],
    };

    try {
        const preferences = JSON.parse(localStorage.getItem('longlink-theme'));
        const accent = Object.hasOwn(accents, preferences?.accent) ? accents[preferences.accent] : null;
        const radius = preferences?.radius;
        const mode = preferences?.theme;
        if (!accent || !['light', 'dark', 'system'].includes(mode) || !Number.isFinite(radius) || radius < 0 || radius > 1.5) {
            return;
        }

        if (mode === 'system') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.dataset.theme = mode;
        }

        const style = document.createElement('style');
        style.id = 'longlink-theme-bootstrap';
        style.textContent = \`:root, :root [data-astryx-theme] {
            color-scheme: \${mode === 'system' ? 'light dark' : mode} !important;
            --color-accent: \${accent[0]} !important;
            --color-accent-muted: light-dark(color-mix(in srgb, var(--color-accent) 20%, transparent), color-mix(in srgb, var(--color-accent) 25%, transparent)) !important;
            --color-text-accent: var(--color-accent) !important;
            --color-icon-accent: var(--color-accent) !important;
            --color-on-accent: \${accent[1]} !important;
            --radius-inner: \${Math.round(4 * radius)}px !important;
            --radius-element: \${Math.round(8 * radius)}px !important;
            --radius-container: \${Math.round(12 * radius)}px !important;
            --radius-page: \${Math.round(28 * radius)}px !important;
            --radius-chat: \${Math.round(28 * radius)}px !important;
        }\`;
        document.head.append(style);
    } catch {
        localStorage.removeItem('longlink-theme');
    }
})();`;

/** Applies cached theme preferences before React hydrates the document. */
export function ThemeBootstrap() {
    return <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />;
}
