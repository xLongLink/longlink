import type { z } from 'zod';
import type { ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { CurrentUserContext } from '@/lib/hooks/use-user';
import { AppearanceContext } from '@/lib/hooks/use-appearance';
import { useQuery, useIsMutating } from '@tanstack/react-query';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { zCurrentUser } from '@/lib/generated/platform-api-v1/zod.gen';
import { useDocumentAppearance } from '@/lib/hooks/use-document-appearance';
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
    useDocumentAppearance(preference?.theme, preference?.accent);

    return <AppearanceContext value={preference ?? defaultAppearance}>{children}</AppearanceContext>;
}

/** Owns account identity and synchronizes preferences across focus and session changes. */
export function AccountAppearanceProvider({ children }: { children: ReactNode }) {
    // Keep one identity observer for both appearance and route access decisions.
    const currentUser = useQuery<z.output<typeof zCurrentUser> | null>({
        queryKey: ['api', '/api/v1/me'],
        queryFn: ({ signal }) => api('/api/v1/me', { signal }).json(zCurrentUser),
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false
    });

    const { data: user, error, refetch } = currentUser;
    const accountId = user?.id;
    const isSaving = useIsMutating({ mutationKey: ['current-user'] }) > 0;
    const isAnonymous = !user && (user === null || (error instanceof ApiError && error.status === 401));

    // Derive previews and saved preferences directly from the authoritative user query.
    const preference = user ? { theme: user.theme, accent: user.accent } : isAnonymous ? defaultAppearance : undefined;

    const cachedPreference = preference && JSON.stringify(preference);

    // Never carry one account's cached colors into an anonymous or different account session.
    useEffect(() => {
        if (isAnonymous) {
            clearAppearanceCache();

            return;
        }

        // Keep previews local until the profile write settles.
        if (!accountId || !cachedPreference || isSaving) return;

        try {
            if (localStorage.getItem('longlink:appearance') !== cachedPreference)
                localStorage.setItem('longlink:appearance', cachedPreference);
        } catch {
            // Saving to the account does not depend on browser storage.
        }
    }, [accountId, cachedPreference, isAnonymous, isSaving]);

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
