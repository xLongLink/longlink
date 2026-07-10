/** Theme mode values supported by the API and UI. */
export const THEME_VALUES = ['light', 'dark', 'system'] as const;

/** Accent values supported by the API and UI. */
export const ACCENT_VALUES = [
    'slate',
    'gray',
    'zinc',
    'neutral',
    'stone',
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
] as const;

/** Radius values supported by the API and UI. */
export const RADIUS_VALUES = ['none', 'small', 'medium', 'large'] as const;

export type Theme = (typeof THEME_VALUES)[number];

export type Accent = (typeof ACCENT_VALUES)[number];

export type Radius = (typeof RADIUS_VALUES)[number];

const THEME_LABELS: Record<Theme, string> = {
    light: 'Light',
    dark: 'Dark',
    system: 'System',
};

type AccentToken = {
    label: string;
    accent: string;
    accentForeground: string;
};

const ACCENT_TOKENS: Record<Accent, AccentToken> = {
    slate: { label: 'Slate', accent: '#64748b', accentForeground: '#f8fafc' },
    gray: { label: 'Gray', accent: '#6b7280', accentForeground: '#f8fafc' },
    zinc: { label: 'Zinc', accent: '#71717a', accentForeground: '#f8fafc' },
    neutral: { label: 'Neutral', accent: '#737373', accentForeground: '#f8fafc' },
    stone: { label: 'Stone', accent: '#78716c', accentForeground: '#f8fafc' },
    red: { label: 'Red', accent: '#ef4444', accentForeground: '#0f172a' },
    orange: { label: 'Orange', accent: '#f97316', accentForeground: '#0f172a' },
    amber: { label: 'Amber', accent: '#f59e0b', accentForeground: '#0f172a' },
    yellow: { label: 'Yellow', accent: '#eab308', accentForeground: '#0f172a' },
    lime: { label: 'Lime', accent: '#84cc16', accentForeground: '#0f172a' },
    green: { label: 'Green', accent: '#22c55e', accentForeground: '#0f172a' },
    emerald: { label: 'Emerald', accent: '#10b981', accentForeground: '#0f172a' },
    teal: { label: 'Teal', accent: '#14b8a6', accentForeground: '#0f172a' },
    cyan: { label: 'Cyan', accent: '#06b6d4', accentForeground: '#0f172a' },
    sky: { label: 'Sky', accent: '#0ea5e9', accentForeground: '#0f172a' },
    blue: { label: 'Blue', accent: '#3b82f6', accentForeground: '#f8fafc' },
    indigo: { label: 'Indigo', accent: '#6366f1', accentForeground: '#f8fafc' },
    violet: { label: 'Violet', accent: '#8b5cf6', accentForeground: '#f8fafc' },
    purple: { label: 'Purple', accent: '#a855f7', accentForeground: '#f8fafc' },
    fuchsia: { label: 'Fuchsia', accent: '#d946ef', accentForeground: '#0f172a' },
    pink: { label: 'Pink', accent: '#ec4899', accentForeground: '#0f172a' },
    rose: { label: 'Rose', accent: '#f43f5e', accentForeground: '#0f172a' },
};

const RADIUS_LABELS: Record<Radius, string> = {
    none: 'None',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
};

/** Theme mode options available in the UI. */
export const THEME_OPTIONS = THEME_VALUES.map((value) => ({ value, label: THEME_LABELS[value] }));

/** Accent options available in the UI. */
export const ACCENT_OPTIONS = ACCENT_VALUES.map((value) => ({
    value,
    label: ACCENT_TOKENS[value].label,
    swatch: ACCENT_TOKENS[value].accent,
}));

/** Radius options available in the UI. */
export const RADIUS_OPTIONS = RADIUS_VALUES.map((value) => ({ value, label: RADIUS_LABELS[value] }));

/** Theme controls that the app can set in one place. */
export type ThemeConfig = {
    theme: Theme;
    background: string;
    border: string;
    cardForeground: string;
    primary: string;
    card: string;
    input: string;
    accent: Accent;
    mutedBackground: string;
    muted: string;
    popoverForeground: string;
    popover: string;
    ring: string;
    radius: Radius;
};

const RADIUS_TOKENS: Record<Radius, string> = {
    none: '0rem',
    small: '0.125rem',
    medium: '0.25rem',
    large: '0.5rem',
};

/** Base color controls for each resolved theme. */
export const THEME_PRESETS: Record<Exclude<Theme, 'system'>, Omit<ThemeConfig, 'theme'>> = {
    light: {
        background: 'oklch(1 0 0)',
        border: 'oklch(0.928 0 0)',
        card: 'oklch(1 0 0)',
        cardForeground: 'oklch(0.145 0 0)',
        primary: 'oklch(0.145 0 0)',
        accent: 'neutral',
        input: 'oklch(0.928 0 0)',
        mutedBackground: 'oklch(0.97 0 0)',
        muted: 'oklch(0.556 0 0)',
        popoverForeground: 'oklch(0.145 0 0)',
        popover: 'oklch(1 0 0)',
        ring: 'oklch(0.556 0 0)',
        radius: 'medium',
    },
    dark: {
        background: 'oklch(0.145 0 0)',
        border: 'oklch(1 0 0 / 10%)',
        card: 'oklch(0.205 0 0)',
        cardForeground: 'oklch(0.985 0 0)',
        primary: 'oklch(0.985 0 0)',
        accent: 'neutral',
        input: 'oklch(1 0 0 / 15%)',
        mutedBackground: 'oklch(0.269 0 0)',
        muted: 'oklch(0.708 0 0)',
        popoverForeground: 'oklch(0.985 0 0)',
        popover: 'oklch(0.205 0 0)',
        ring: 'oklch(0.556 0 0)',
        radius: 'medium',
    },
};

/** Resolves the selected theme to a concrete light or dark mode. */
export function resolveTheme(theme: Theme): Exclude<Theme, 'system'> {
    // Concrete themes do not need media-query resolution.
    if (theme !== 'system') {
        return theme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applies the resolved theme, palette, and radius to the document root. */
export function applyTheme(root: HTMLElement, config: ThemeConfig) {
    const resolvedTheme = resolveTheme(config.theme);
    const accent = ACCENT_TOKENS[config.accent];

    root.classList.remove('light', 'dark');
    root.dataset.theme = resolvedTheme;
    root.style.setProperty('--background', config.background);
    root.style.setProperty('--border', config.border);
    root.style.setProperty('--card', config.card);
    root.style.setProperty('--card-foreground', config.cardForeground);
    root.style.setProperty('--input', config.input);
    root.style.setProperty('--foreground', config.primary);
    root.style.setProperty('--muted', config.mutedBackground);
    root.style.setProperty('--muted-foreground', config.muted);
    root.style.setProperty('--popover', config.popover);
    root.style.setProperty('--popover-foreground', config.popoverForeground);
    root.style.setProperty('--accent', accent.accent);
    root.style.setProperty('--primary', accent.accent);
    root.style.setProperty('--accent-foreground', accent.accentForeground);
    root.style.setProperty('--primary-foreground', accent.accentForeground);
    root.style.setProperty('--ring', config.ring);
    root.style.setProperty('--radius', RADIUS_TOKENS[config.radius]);
}
