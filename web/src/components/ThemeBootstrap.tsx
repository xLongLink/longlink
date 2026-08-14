import { ACCENT_BOOTSTRAP_VALUES, MAX_RADIUS, MIN_RADIUS, THEME_PREFERENCES_KEY } from '@/lib/theme';

export const THEME_BOOTSTRAP_ID = 'longlink-theme-bootstrap';

const themeBootstrap = `
(() => {
    const accents = ${JSON.stringify(ACCENT_BOOTSTRAP_VALUES)};

    try {
        const preferences = JSON.parse(localStorage.getItem('${THEME_PREFERENCES_KEY}'));
        const accent = Object.hasOwn(accents, preferences?.accent) ? accents[preferences.accent] : null;
        const radius = preferences?.radius;
        if (!accent || !Number.isFinite(radius) || radius < ${MIN_RADIUS} || radius > ${MAX_RADIUS}) {
            return;
        }

        const style = document.createElement('style');
        style.id = '${THEME_BOOTSTRAP_ID}';
        style.textContent = \`:root, :root [data-astryx-theme] {
            color-scheme: dark !important;
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
        localStorage.removeItem('${THEME_PREFERENCES_KEY}');
    }
})();`;

/** Applies cached theme preferences before React hydrates the document. */
export function ThemeBootstrap() {
    return <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />;
}
