import { ApiError } from '@/lib/api';
import type { ReactNode } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@/lib/generated/stone.js';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { useIsMutating } from '@tanstack/react-query';
import { AppearanceContext } from '@/lib/hooks/use-appearance';
import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { appearanceSchema, clearAppearanceCache, defaultAppearance, type Appearance } from '@/lib/appearance';

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
export function AppearanceProvider({ children, preference }: { children: ReactNode; preference?: Appearance }) {
    const cache = useSyncExternalStore(subscribeToCache, readCache, () => null);

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
        <AppearanceContext value={{ appearance }}>
            <Theme theme={stoneTheme} mode={appearance.theme}>
                {children}
            </Theme>
        </AppearanceContext>
    );
}

/** Refreshes account preferences on navigation/focus and clears them on session loss. */
export function AccountAppearanceProvider({ children }: { children: ReactNode }) {
    const { data: user, error, refetch } = useCurrentUser();
    const isSaving = useIsMutating({ mutationKey: ['current-user'] }) > 0;

    // Derive previews and saved preferences directly from the authoritative user query.
    const preference = user
        ? { theme: user.theme, accent: user.accent, navigation: user.navigation }
        : error instanceof ApiError && error.status === 401
          ? defaultAppearance
          : undefined;

    // Never carry one account's cached colors into an anonymous or different account session.
    useEffect(() => {
        if (user) {
            const appearance = { theme: user.theme, accent: user.accent, navigation: user.navigation };

            // Keep previews local until the profile write settles.
            if (!isSaving) {
                try {
                    const cached = JSON.stringify(appearance);

                    if (localStorage.getItem('longlink:appearance') !== cached)
                        localStorage.setItem('longlink:appearance', cached);
                } catch {
                    // Saving to the account does not depend on browser storage.
                }
            }
        } else if (error instanceof ApiError && error.status === 401) {
            clearAppearanceCache();
        }
    }, [user, error, isSaving]);

    // Revalidate the account rather than trusting another tab's cached identity.
    useEffect(() => {
        return subscribeToCache(() => {
            void refetch();
        });
    }, [refetch]);

    return <AppearanceProvider preference={preference}>{children}</AppearanceProvider>;
}
