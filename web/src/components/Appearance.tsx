import type { z } from 'zod';
import type { ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { CurrentUserContext } from '@/lib/hooks/use-user';
import { AppearanceContext } from '@/lib/hooks/use-appearance';
import { useQuery, useIsMutating } from '@tanstack/react-query';
import { useDocumentTheme } from '@/lib/hooks/use-document-theme';
import { zCurrentUser } from '@/lib/generated/platform-api-v1/zod.gen';
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
    useDocumentTheme(appearance.theme);

    // Switching the personal accent requires only an attribute change, before paint.
    useLayoutEffect(() => {
        const previous = document.documentElement.getAttribute('data-accent');
        document.documentElement.dataset.accent = appearance.accent;

        return () => {
            if (previous === null) delete document.documentElement.dataset.accent;
            else document.documentElement.setAttribute('data-accent', previous);
        };
    }, [appearance.accent]);

    return <AppearanceContext value={{ appearance }}>{children}</AppearanceContext>;
}

/** Owns account identity and synchronizes preferences across focus and session changes. */
export function AccountAppearanceProvider({ children }: { children: ReactNode }) {
    // Keep one identity observer for both appearance and route access decisions.
    const currentUser = useQuery<z.output<typeof zCurrentUser> | null>({
        queryKey: ['api', '/api/v1/me'],
        queryFn: ({ signal }) => api('/api/v1/me', { signal }).json(zCurrentUser),
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });

    const { data: user, error, refetch } = currentUser;
    const isSaving = useIsMutating({ mutationKey: ['current-user'] }) > 0;

    // Derive previews and saved preferences directly from the authoritative user query.
    const preference = user
        ? { theme: user.theme, accent: user.accent }
        : user === null || (error instanceof ApiError && error.status === 401)
          ? defaultAppearance
          : undefined;

    // Never carry one account's cached colors into an anonymous or different account session.
    useEffect(() => {
        if (user) {
            const appearance = { theme: user.theme, accent: user.accent };

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
        } else if (user === null || (error instanceof ApiError && error.status === 401)) {
            clearAppearanceCache();
        }
    }, [user, error, isSaving]);

    // Revalidate the account rather than trusting another tab's cached identity.
    useEffect(() => {
        return subscribeToCache(() => {
            void refetch();
        });
    }, [refetch]);

    return (
        <CurrentUserContext value={currentUser}>
            <AppearanceProvider preference={preference}>{children}</AppearanceProvider>
        </CurrentUserContext>
    );
}
