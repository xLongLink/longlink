import { neutralTheme } from '@astryxdesign/theme-neutral';
import { defineTheme, type DefinedTheme } from '@astryxdesign/core/theme';

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

const RADIUS_MULTIPLIERS: Record<Radius, number> = {
    none: 0,
    small: 0.5,
    medium: 1,
    large: 1.5,
};

const themes = new Map<string, DefinedTheme>();

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

/** Returns the Astryx theme for one persisted accent and radius selection. */
export function getAstryxTheme(accentValue: Accent, radius: Radius): DefinedTheme {
    const key = `${accentValue}-${radius}`;

    // Reuse theme objects so Astryx does not reinject equivalent CSS.
    const existing = themes.get(key);
    if (existing) {
        return existing;
    }

    // Keep surfaces neutral while applying the selected color to accent roles.
    const accent = ACCENT_TOKENS[accentValue];
    const theme = defineTheme({
        name: `longlink-${key}`,
        extends: neutralTheme,
        typography: {
            body: { family: 'Inter Variable', fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
            heading: {
                family: 'Inter Variable',
                fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
        },
        radius: { base: 4, multiplier: RADIUS_MULTIPLIERS[radius] },
        components: {
            table: {
                base: {
                    borderColor: 'var(--color-border-emphasized)',
                    borderStyle: 'solid',
                    borderWidth: 'var(--border-width)',
                },
            },
            'table-header': {
                base: { backgroundColor: 'var(--color-background-muted)' },
            },
        },
        tokens: {
            '--color-background-surface': ['oklch(1 0 0)', 'oklch(0.205 0 0)'],
            '--color-background-body': ['oklch(1 0 0)', 'oklch(0.145 0 0)'],
            '--color-background-card': ['oklch(1 0 0)', 'oklch(0.205 0 0)'],
            '--color-background-popover': ['oklch(1 0 0)', 'oklch(0.205 0 0)'],
            '--color-background-muted': ['oklch(0.97 0 0)', 'oklch(0.235 0 0)'],
            '--color-accent': accentValue === 'neutral' ? ['oklch(0.205 0 0)', 'oklch(0.922 0 0)'] : accent.accent,
            '--color-accent-muted': [
                'color-mix(in srgb, var(--color-accent) 20%, transparent)',
                'color-mix(in srgb, var(--color-accent) 25%, transparent)',
            ],
            '--color-text-accent': 'var(--color-accent)',
            '--color-icon-accent': 'var(--color-accent)',
            '--color-on-accent':
                accentValue === 'neutral' ? ['oklch(0.985 0 0)', 'oklch(0.205 0 0)'] : accent.accentForeground,
        },
    });

    themes.set(key, theme);

    return theme;
}
