import type { z } from 'zod';
import { zCurrentUser } from '@/lib/generated/platform-api-v1/zod.gen';

export const appearanceSchema = zCurrentUser.pick({ theme: true });

export type Appearance = z.output<typeof appearanceSchema>;

export const defaultAppearance: Appearance = { theme: 'system' };

// Restore the saved appearance before the shared stylesheet renders the document.
export const appearanceBootstrap = `(() => {
    try {
        if (location.pathname === '/' && document.currentScript?.hasAttribute('data-platform')) return;
        if (/^\\/(login|register|auth)(\\/|$)/.test(location.pathname)) return;
        const preference = JSON.parse(localStorage.getItem('longlink:appearance') || 'null');
        const modes = ${JSON.stringify(zCurrentUser.shape.theme.options)};
        if (!preference || !modes.includes(preference.theme)) return;
        const root = document.documentElement;
        if (preference.theme !== 'system') root.dataset.theme = preference.theme;
    } catch {}
})();`;

/** Discards the previous account's startup preference after a successful logout. */
export function clearAppearanceCache() {
    try {
        localStorage.removeItem('longlink:appearance');
    } catch {
        // Appearance remains usable when browser storage is unavailable.
    }
}
