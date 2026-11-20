import type { z } from 'zod';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { AppearanceProvider } from '@/components/appearance';
import { CurrentUserContext } from '@/platform/hooks/use-user';
import { useQuery, useIsMutating } from '@tanstack/react-query';
import { zCurrentUser } from '@/lib/generated/platform-api-v1/zod.gen';
import { clearAppearanceCache, defaultAppearance } from '@/lib/appearance';

/** Owns account identity and synchronizes preferences across focus and session changes. */
export function AccountProvider({ children }: { children: ReactNode }) {
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
    const preference = user ? { theme: user.theme } : isAnonymous ? defaultAppearance : undefined;

    const cachedPreference = preference && JSON.stringify(preference);

    // Never carry one account's cached theme into an anonymous or different account session.
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
        const refresh = (event: StorageEvent) => {
            if (event.key === 'longlink:appearance') void refetch();
        };

        window.addEventListener('storage', refresh);

        return () => window.removeEventListener('storage', refresh);
    }, [refetch]);

    return (
        <CurrentUserContext value={currentUser}>
            <AppearanceProvider preference={preference}>{children}</AppearanceProvider>
        </CurrentUserContext>
    );
}
