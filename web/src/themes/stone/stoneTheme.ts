/**
 * Stone Theme
 *
 * A warm, earthy neutral theme inspired by natural stone and sandstone.
 * Core palette: #28282A, #84848B, #D8D8DB, #f3f3f5, #FFFFFF
 * Montserrat for headings, Figtree for body, JetBrains Mono for code.
 */

import { defineTheme, defineSyntaxTheme } from '@astryxdesign/core/theme';
import { stoneIconRegistry } from './icons';

/**
 * Stone syntax palette — light values snap to T40 / T45 stops on the
 * stone categorical ramps (per audit drawer); dark values stay at T70.
 *
 * `string` and `property` both land on Teal T40 — intentional; the audit
 * unified them since green and teal are visually adjacent at T40 and
 * the stone neutral palette doesn't carry a distinct green stop.
 */
const stoneSyntax = defineSyntaxTheme({
    name: 'xds-stone',
    tokens: {
        keyword: ['#645a72', '#b2a7c1'], // Purple T40 / T70
        string: ['#4e6357', '#9bb19a'], // Teal T40 / Green T70
        comment: ['#5e5e5e', '#ababb0'], // Stone Neutral T40 / T70
        number: ['#755752', '#bea792'], // Red T40 / Orange T70
        function: ['#506072', '#99adc6'], // Blue T40 / T70
        type: ['#645a72', '#b2a7c1'], // Purple T40 / T70
        variable: ['#5e5e5e', '#ababb0'], // Stone Neutral T40 / T70
        operator: ['#5e5e5e', '#ababb0'], // Stone Neutral T40 / T70
        constant: ['#755752', '#bea792'], // Red T40 / Orange T70
        tag: ['#775751', '#c7a39d'], // Red T40 / T70
        attribute: ['#79693f', '#b6aa90'], // Yellow T45 / T70
        property: ['#4e6357', '#94b2a0'], // Teal T40 / T70
        punctuation: ['#5e5e5e', '#ababb0'], // Stone Neutral T40 / T70
        background: ['#f3f3f5', '#171719'],
    },
});

export const stoneTheme = defineTheme({
    name: 'stone',

    typography: {
        scale: { base: 14, ratio: 1.25 },
        body: {
            family: 'Figtree',
            fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        heading: {
            family: 'Montserrat',
            fallbacks: '"Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            weights: { 3: 'bold', 4: 'bold' },
        },
        code: {
            family: 'JetBrains Mono',
            fallbacks: '"SF Mono", Monaco, Consolas, monospace',
        },
    },

    motion: { fast: 125, medium: 300, slow: 700, ratio: 0.75 },

    syntax: stoneSyntax,

    tokens: {
        // =========================================================================
        // Colors — warm stone palette
        // Core: #28282A, #84848B, #D8D8DB, #f3f3f5, #FFFFFF
        // =========================================================================

        // Core semantic — all neutrals H=291
        // Stone 900 T=16 C=1.4, Stone 500 T=55 C=4, Stone 300 T=86 C=1.6, Stone 100 T=96 C=1
        '--color-accent': ['#25252a', '#f3f3f5'], // light: Stone Neutral T15
        '--color-accent-muted': ['#25252a14', '#f3f3f520'], // light: Stone Neutral T15 · 8% / dark: T96 · 12.5%
        '--color-neutral': ['#25252a0f', '#f3f3f51a'], // light: Stone Neutral T15 · 6% / dark: T96 · 10%
        '--color-background-surface': ['#ffffff', '#1b1b1f'], // dark: Stone Neutral T10
        '--color-background-body': ['#f3f3f5', '#111015'], // dark: Stone Neutral T5
        '--color-overlay': ['#25252a80', '#28282acc'], // light: Stone Neutral T15 · 50% / dark: 80%
        '--color-overlay-hover': ['#25252a0d', '#f3f3f50d'], // light: Stone Neutral T15 · 5% / dark: T96 · 5%
        '--color-overlay-pressed': ['#25252a1a', '#f3f3f51a'], // light: Stone Neutral T15 · 10% / dark: T96 · 10%
        '--color-background-muted': ['#e2e2e8', '#3b3b3f'], // light: Stone Neutral T90

        // Text — H=291
        '--color-text-primary': ['#25252a', '#f3f3f5'], // light: Stone Neutral T15
        '--color-text-secondary': ['#83838a', '#9d9da3'], // T55 C=4 / T65 C=3
        '--color-text-disabled': ['#d7d7da', '#5e5e61'], // T86 C=1.6 / T40 C=2
        '--color-text-accent': ['#25252a', '#f3f3f5'], // light: Stone Neutral T15
        '--color-on-dark': '#FFFFFF',
        '--color-on-light': ['#25252a', '#28282a'], // light: Stone Neutral T15
        '--color-on-accent': ['#ffffff', '#25252a'], // dark: Stone Neutral T15
        // Text on top of matching status surface (badge fill, banner content).
        '--color-on-success': ['#374c36', '#d0e9ce'], // Green T30 / T90
        '--color-on-error': ['#58413e', '#f9dcd7'], // Red T30 / T90
        '--color-on-warning': ['#524622', '#f4e1b7'], // Yellow T30 / T90

        // Icon — H=291
        '--color-icon-accent': ['#25252a', '#f3f3f5'], // light: Stone Neutral T15
        '--color-icon-primary': ['#25252a', '#f3f3f5'], // light: Stone Neutral T15
        '--color-icon-secondary': ['#83838a', '#9d9da3'], // T55 C=4 / T65 C=3
        '--color-icon-disabled': ['#d7d7da', '#5e5e61'], // T86 C=1.6 / T40 C=2

        // Surface variants — H=291
        '--color-background-card': ['#FFFFFF', '#242325'], // T14
        '--color-background-popover': ['#ffffff', '#25252a'], // dark: Stone Neutral T15
        '--color-background-inverted': ['#25252a', '#f3f3f5'], // light: Stone Neutral T15

        // Status / Sentiment — T50 from palette for icons/borders (visible color)
        '--color-success': ['#374c36', '#b4cdb2'], // Green T30 / T80
        '--color-success-muted': ['#d0e9ce', '#b4cdb2'], // Green T90 / T80
        '--color-error': ['#58413e', '#dcc0bc'], // Red T30 / T80
        '--color-error-muted': ['#f9dcd7', '#dcc0bc'], // Red T90 / T80
        '--color-warning': ['#524622', '#d7c59c'], // Yellow T30 / T80
        '--color-warning-muted': ['#f4e1b7', '#d7c59c'], // Yellow T90 / T80

        // Border — H=291
        '--color-border': ['#e2e2e8', '#f3f3f51a'], // light: Stone Neutral T90 / dark: T96 · 10%
        '--color-border-emphasized': ['#83838a', '#5e5e61'], // T55 C=4 / T40 C=2

        // Effects — H=291
        '--color-skeleton': ['#d4d4da', '#5e5e64'], // T85 / T40 from H=291 C=3
        '--color-shadow': ['#25252a1a', '#0000004d'], // light: Stone Neutral T15 · 10% / dark: 30%
        '--color-tint-hover': ['black', 'white'],

        // Documentation typography
        '--text-heading-1-size': 'var(--font-size-3xl)',
        '--text-heading-1-leading': '1.2941',
        '--text-heading-2-size': '1.75rem',
        '--text-heading-2-leading': '1.4286',
        '--text-heading-3-size': 'var(--font-size-xl)',
        '--text-heading-3-leading': '1.4545',
        '--text-heading-4-size': 'var(--font-size-lg)',
        '--text-heading-4-leading': '1.5556',
        '--text-body-size': '1rem',
        '--text-body-leading': '1.5',
        '--text-supporting-size': 'var(--font-size-base)',
        '--text-supporting-leading': '1.4286',

        // Categorical hues
        //   Light: T90 solid bg + T30 text (pastel surface, dark text)
        //   Dark:  T35 solid bg + T90 text — snaps to canonical palette stops
        //          per theming-infra.mdc §7. T90 dark text is the SAME hex as
        //          the light-mode bg pastel — clean palette symmetry, ~6–9:1
        //          contrast on the T35 surface across all hues (passes AA Body).
        // Borders: light T85 / dark T25 — one step inward from surface in both
        //          modes, matching the light-mode T90/T85 spacing.

        // Categorical — Blue H=265 C=10
        '--color-background-blue': ['#d7e4f5', '#485362'], // light T90 / dark T35
        '--color-border-blue': ['#c9d6e7', '#313c4a'], // light T85 / dark T25
        '--color-icon-blue': ['#3c4856', '#d7e4f5'], // light T30 / dark T90
        '--color-text-blue': ['#3c4856', '#d7e4f5'],

        // Categorical — Cyan H=190 C=10
        '--color-background-cyan': ['#cce8e5', '#3e5755'],
        '--color-border-cyan': ['#bedad7', '#28403e'],
        '--color-icon-cyan': ['#334b49', '#cce8e5'],
        '--color-text-cyan': ['#334b49', '#cce8e5'],

        // Categorical — Gray (pure neutral, C=0). Same T35/T25/T90 pattern from
        // the neutral H=291 C=3 ramp.
        '--color-background-gray': ['#e2e2e8', '#525257'], // light: Stone Neutral T90
        '--color-border-gray': ['#d4d4da', '#3b3b3f'], // light: Stone Neutral T85
        '--color-icon-gray': ['#46464b', '#e2e2e8'], // light: Stone Neutral T30
        '--color-text-gray': ['#46464b', '#e2e2e8'], // light: Stone Neutral T30

        // Categorical — Green H=142 C=17
        '--color-background-green': ['#d0e9ce', '#425841'],
        '--color-border-green': ['#c2dbc0', '#2b402b'],
        '--color-icon-green': ['#374c36', '#d0e9ce'],
        '--color-text-green': ['#374c36', '#d0e9ce'],

        // Categorical — Orange H=70 C=22
        '--color-background-orange': ['#ffdcbb', '#684d32'],
        '--color-border-orange': ['#f1ceae', '#4f361c'],
        '--color-icon-orange': ['#5b4227', '#ffdcbb'],
        '--color-text-orange': ['#5b4227', '#ffdcbb'],

        // Categorical — Pink H=340 C=9
        '--color-background-pink': ['#f0dde8', '#5e4e57'],
        '--color-border-pink': ['#e2cfda', '#463740'],
        '--color-icon-pink': ['#52424c', '#f0dde8'],
        '--color-text-pink': ['#52424c', '#f0dde8'],

        // Categorical — Purple H=307 C=11
        '--color-background-purple': ['#e8dff3', '#564f60'],
        '--color-border-purple': ['#d9d1e5', '#3f3949'],
        '--color-icon-purple': ['#4b4454', '#e8dff3'],
        '--color-text-purple': ['#4b4454', '#e8dff3'],

        // Categorical — Red H=33 C=11
        '--color-background-red': ['#f9dcd7', '#644d49'],
        '--color-border-red': ['#ebcec9', '#4c3633'],
        '--color-icon-red': ['#58413e', '#f9dcd7'],
        '--color-text-red': ['#58413e', '#f9dcd7'],

        // Categorical — Teal H=158 C=9
        '--color-background-teal': ['#d4e7dc', '#46564d'],
        '--color-border-teal': ['#c6d9ce', '#303f36'],
        '--color-icon-teal': ['#3b4a41', '#d4e7dc'],
        '--color-text-teal': ['#3b4a41', '#d4e7dc'],

        // Categorical — Yellow H=90 C=23
        '--color-background-yellow': ['#f4e1b7', '#5e512d'],
        '--color-border-yellow': ['#e5d3a9', '#463a18'],
        '--color-icon-yellow': ['#524622', '#f4e1b7'],
        '--color-text-yellow': ['#524622', '#f4e1b7'],

        // =========================================================================
        // Radius — clean and subtle
        // =========================================================================
        '--radius-none': '0.125rem',
        '--radius-inner': '0.25rem',
        '--radius-element': '0.5rem',
        '--radius-container': '0.75rem',
        '--radius-page': '1.5rem',
        '--radius-full': '9999px',

        // =========================================================================
        // Shadows
        // =========================================================================
        '--shadow-low': '0 2px 4px #28282A0D, 0 4px 8px #28282A1A',
        '--shadow-med': '0 2px 4px #28282A0D, 0 4px 12px #28282A1A',
        '--shadow-high': '0 4px 6px #28282A1A, 0 12px 24px #28282A26',
        '--shadow-inset-hover': 'inset 0px 0px 0px 2px #28282A30',
        '--shadow-inset-selected': 'inset 0px 0px 0px 2px #28282A50',
        '--shadow-inset-success': 'inset 0px 0px 0px 2px #83838a30',
        '--shadow-inset-warning': 'inset 0px 0px 0px 2px #83838a30',
        '--shadow-inset-error': 'inset 0px 0px 0px 2px #83838a30',
    },

    components: {
        button: {
            base: {
                borderRadius: 'var(--radius-element)',
            },
            'variant:secondary': {
                backgroundColor: 'transparent',
                borderWidth: '1.5px',
                borderStyle: 'solid',
                borderColor: 'var(--color-border-emphasized)',
                ':hover': {
                    backgroundColor: 'var(--color-neutral)',
                },
            },
            'variant:destructive': {
                backgroundColor: 'var(--color-background-red)',
                color: 'var(--color-text-red)',
            },
        },

        // Semantic variants point at categorical hue tokens — single source of truth.
        badge: {
            'variant:info': {
                backgroundColor: 'var(--color-background-blue)',
                color: 'var(--color-text-blue)',
            },
            'variant:neutral': {
                backgroundColor: 'var(--color-background-gray)',
                color: 'var(--color-text-gray)',
            },
            'variant:success': {
                backgroundColor: 'var(--color-background-green)',
                color: 'var(--color-text-green)',
            },
            'variant:warning': {
                backgroundColor: 'var(--color-background-yellow)',
                color: 'var(--color-text-yellow)',
            },
            'variant:error': {
                backgroundColor: 'var(--color-background-red)',
                color: 'var(--color-text-red)',
            },
        },

        // StyleX paints the banner surface from @layer priority4 (above
        // @layer astryx-theme), so a direct backgroundColor override loses the
        // cascade. Redefine the muted token instead so StyleX's var() resolves
        // to the categorical bg in our scope.
        banner: {
            'status:info': {
                '--color-accent-muted': 'var(--color-background-blue)',
                '--color-text-primary': 'var(--color-text-blue)',
                '--color-text-secondary': 'var(--color-text-blue)',
                '--color-accent': 'var(--color-text-blue)',
            },
            'status:success': {
                '--color-success-muted': 'var(--color-background-green)',
                '--color-text-primary': 'var(--color-text-green)',
                '--color-text-secondary': 'var(--color-text-green)',
                '--color-success': 'var(--color-text-green)',
            },
            'status:warning': {
                '--color-warning-muted': 'var(--color-background-yellow)',
                '--color-text-primary': 'var(--color-text-yellow)',
                '--color-text-secondary': 'var(--color-text-yellow)',
                '--color-warning': 'var(--color-text-yellow)',
            },
            'status:error': {
                '--color-error-muted': 'var(--color-background-red)',
                '--color-text-primary': 'var(--color-text-red)',
                '--color-text-secondary': 'var(--color-text-red)',
                '--color-error': 'var(--color-text-red)',
            },
        },

        // Switch off-state track reads --color-background-gray by default.
        // Redefine it inside the switch scope to --color-skeleton, matching
        // the ProgressBar track. The on-state reads --color-accent (unaffected);
        // disabled-off also picks up --color-skeleton for consistency.
        switch: {
            base: {
                '--color-background-gray': 'var(--color-skeleton)',
            },
        },

        card: {
            base: {
                padding: 'var(--spacing-3)',
            },
        },

        section: {
            base: {
                padding: 'var(--spacing-3)',
            },
        },
    },

    icons: stoneIconRegistry,
});
