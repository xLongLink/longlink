import type { ReactNode } from 'react';
import { useMemo, useSyncExternalStore } from 'react';
import { AppearanceContext } from '@/lib/hooks/use-appearance';
import { useDocumentAppearance } from '@/lib/hooks/use-document-appearance';
import { appearanceSchema, defaultAppearance, type Appearance } from '@/lib/appearance';

/** Observes optional startup data without sharing state between documents. */
function subscribeToCache(notify: () => void) {
    const refresh = (event: StorageEvent) => {
        if (event.key === 'longlink:appearance') notify();
    };

    window.addEventListener('storage', refresh);

    return () => window.removeEventListener('storage', refresh);
}

/** Reads cached preferences without requiring browser storage. */
function readCache() {
    if (/^\/(login|register|auth)(\/|$)/.test(window.location.pathname)) return null;

    try {
        return localStorage.getItem('longlink:appearance');
    } catch {
        return null;
    }
}

/** Follows cached personal appearance in isolated Solution hosts. */
export function CachedAppearanceProvider({ children }: { children: ReactNode }) {
    const cache = useSyncExternalStore(subscribeToCache, readCache, () => null);

    // Validate the browser snapshot without changing server markup during hydration.
    const appearance = useMemo(() => {
        try {
            const parsed = appearanceSchema.safeParse(JSON.parse(cache ?? 'null'));

            return parsed.success ? parsed.data : defaultAppearance;
        } catch {
            return defaultAppearance;
        }
    }, [cache]);

    return <AppearanceProvider preference={appearance}>{children}</AppearanceProvider>;
}

/** Applies personal appearance once its owner has resolved the preference. */
export function AppearanceProvider({ children, preference }: { children: ReactNode; preference?: Appearance }) {
    useDocumentAppearance(preference?.theme);

    return <AppearanceContext value={preference ?? defaultAppearance}>{children}</AppearanceContext>;
}
