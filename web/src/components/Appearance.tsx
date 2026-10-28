import { ApiError } from '@/lib/api';
import type { ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@/lib/generated/stone.js';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { appearanceSchema, clearAppearanceCache, defaultAppearance, type Appearance } from '@/lib/appearance';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';

const AppearanceContext = createContext({
    appearance: defaultAppearance,
    setAppearance: (_appearance: Appearance) => {},
});

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

/** Shares personal appearance across native pages and isolated Solution hosts. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
    const cache = useSyncExternalStore(subscribeToCache, readCache, () => null);
    const [preference, setAppearance] = useState<Appearance>();

    // Read the browser snapshot before paint; validated account data takes precedence.
    const cached = useMemo(() => {
        try {
            const parsed = appearanceSchema.safeParse(JSON.parse(cache ?? 'null'));

            return parsed.success ? parsed.data : defaultAppearance;
        } catch {
            return defaultAppearance;
        }
    }, [cache]);

    const appearance = preference ?? cached;

    // Switching the personal accent requires only an attribute change, before paint.
    useLayoutEffect(() => {
        document.documentElement.dataset.accent = appearance.accent;

        return () => {
            delete document.documentElement.dataset.accent;
        };
    }, [appearance.accent]);

    return (
        <AppearanceContext value={{ appearance, setAppearance }}>
            <Theme theme={stoneTheme} mode={appearance.theme}>
                {children}
            </Theme>
        </AppearanceContext>
    );
}

/** Reads the current appearance and supports immediate previews while saving. */
export function useAppearance() {
    return useContext(AppearanceContext);
}

/** Refreshes account preferences on navigation/focus and clears them on session loss. */
export function AppearanceSync() {
    const { data: user, error, refetch } = useCurrentUser();
    const { setAppearance } = useAppearance();

    // Never carry one account's cached colors into an anonymous or different account session.
    useEffect(() => {
        if (user) {
            const appearance = { theme: user.theme, accent: user.accent };
            setAppearance(appearance);

            try {
                const cached = JSON.stringify(appearance);

                if (localStorage.getItem('longlink:appearance') !== cached)
                    localStorage.setItem('longlink:appearance', cached);
            } catch {
                // Saving to the account does not depend on browser storage.
            }
        } else if (error instanceof ApiError && error.status === 401) {
            setAppearance(defaultAppearance);
            clearAppearanceCache();
        }
    }, [user, error, setAppearance]);

    // Revalidate the account rather than trusting another tab's cached identity.
    useEffect(() => {
        const refresh = (event: StorageEvent) => {
            if (event.key === 'longlink:appearance') void refetch();
        };

        window.addEventListener('storage', refresh);

        return () => window.removeEventListener('storage', refresh);
    }, [refetch]);

    return null;
}
