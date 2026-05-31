/** Theme mode options available in the UI. */
export const THEME_OPTIONS = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
] as const;

/** Accent options available in the UI. */
export const ACCENT_OPTIONS = [
    { value: 'slate', label: 'Slate', swatch: '#64748b' },
    { value: 'gray', label: 'Gray', swatch: '#6b7280' },
    { value: 'zinc', label: 'Zinc', swatch: '#71717a' },
    { value: 'neutral', label: 'Neutral', swatch: '#737373' },
    { value: 'stone', label: 'Stone', swatch: '#78716c' },
    { value: 'red', label: 'Red', swatch: '#ef4444' },
    { value: 'orange', label: 'Orange', swatch: '#f97316' },
    { value: 'amber', label: 'Amber', swatch: '#f59e0b' },
    { value: 'yellow', label: 'Yellow', swatch: '#eab308' },
    { value: 'lime', label: 'Lime', swatch: '#84cc16' },
    { value: 'green', label: 'Green', swatch: '#22c55e' },
    { value: 'emerald', label: 'Emerald', swatch: '#10b981' },
    { value: 'teal', label: 'Teal', swatch: '#14b8a6' },
    { value: 'cyan', label: 'Cyan', swatch: '#06b6d4' },
    { value: 'sky', label: 'Sky', swatch: '#0ea5e9' },
    { value: 'blue', label: 'Blue', swatch: '#3b82f6' },
    { value: 'indigo', label: 'Indigo', swatch: '#6366f1' },
    { value: 'violet', label: 'Violet', swatch: '#8b5cf6' },
    { value: 'purple', label: 'Purple', swatch: '#a855f7' },
    { value: 'fuchsia', label: 'Fuchsia', swatch: '#d946ef' },
    { value: 'pink', label: 'Pink', swatch: '#ec4899' },
    { value: 'rose', label: 'Rose', swatch: '#f43f5e' },
] as const;

/** Radius options available in the UI. */
export const RADIUS_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
] as const;

export type Theme = (typeof THEME_OPTIONS)[number]['value'];

export type Accent = (typeof ACCENT_OPTIONS)[number]['value'];

export type Radius = (typeof RADIUS_OPTIONS)[number]['value'];

/** Theme controls that the app can set in one place. */
export type ThemeConfig = {
    theme: Theme;
    background: string;
    primary: string;
    accent: Accent;
    muted: string;
    radius: Radius;
};

type AccentToken = {
    accent: string;
    accentForeground: string;
};

const ACCENT_TOKENS: Record<Accent, AccentToken> = {
    slate: { accent: '#64748b', accentForeground: '#f8fafc' },
    gray: { accent: '#6b7280', accentForeground: '#f8fafc' },
    zinc: { accent: '#71717a', accentForeground: '#f8fafc' },
    neutral: { accent: '#737373', accentForeground: '#f8fafc' },
    stone: { accent: '#78716c', accentForeground: '#f8fafc' },
    red: { accent: '#ef4444', accentForeground: '#0f172a' },
    orange: { accent: '#f97316', accentForeground: '#0f172a' },
    amber: { accent: '#f59e0b', accentForeground: '#0f172a' },
    yellow: { accent: '#eab308', accentForeground: '#0f172a' },
    lime: { accent: '#84cc16', accentForeground: '#0f172a' },
    green: { accent: '#22c55e', accentForeground: '#0f172a' },
    emerald: { accent: '#10b981', accentForeground: '#0f172a' },
    teal: { accent: '#14b8a6', accentForeground: '#0f172a' },
    cyan: { accent: '#06b6d4', accentForeground: '#0f172a' },
    sky: { accent: '#0ea5e9', accentForeground: '#0f172a' },
    blue: { accent: '#3b82f6', accentForeground: '#f8fafc' },
    indigo: { accent: '#6366f1', accentForeground: '#f8fafc' },
    violet: { accent: '#8b5cf6', accentForeground: '#f8fafc' },
    purple: { accent: '#a855f7', accentForeground: '#f8fafc' },
    fuchsia: { accent: '#d946ef', accentForeground: '#0f172a' },
    pink: { accent: '#ec4899', accentForeground: '#0f172a' },
    rose: { accent: '#f43f5e', accentForeground: '#0f172a' },
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
        primary: 'oklch(0.145 0 0)',
        accent: 'neutral',
        muted: 'oklch(0.556 0 0)',
        radius: 'medium',
    },
    dark: {
        background: 'oklch(0.145 0 0)',
        primary: 'oklch(0.985 0 0)',
        accent: 'neutral',
        muted: 'oklch(0.708 0 0)',
        radius: 'medium',
    },
};

/** Resolves the selected theme to a concrete light or dark mode. */
export function resolveTheme(theme: Theme): Exclude<Theme, 'system'> {
    if (theme !== 'system') {
        return theme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applies only the active light or dark class to the document root. */
export function setThemeMode(root: HTMLElement, theme: Theme) {
    const resolvedTheme = resolveTheme(theme);

    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
}

/** Applies the resolved theme, palette, and radius to the document root. */
export function applyTheme(root: HTMLElement, config: ThemeConfig) {
    const resolvedTheme = resolveTheme(config.theme);
    const accent = ACCENT_TOKENS[config.accent];

    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.style.setProperty('--background', config.background);
    root.style.setProperty('--foreground', config.primary);
    root.style.setProperty('--muted-foreground', config.muted);
    root.style.setProperty('--accent', accent.accent);
    root.style.setProperty('--primary', accent.accent);
    root.style.setProperty('--accent-foreground', accent.accentForeground);
    root.style.setProperty('--primary-foreground', accent.accentForeground);
    root.style.setProperty('--radius', RADIUS_TOKENS[config.radius]);
}

