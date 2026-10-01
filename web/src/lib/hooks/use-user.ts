import type { z } from 'zod';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

// Share the user validated by the authenticated route boundary.
export const AuthenticatedUserContext = createContext<z.output<typeof zUserSummary> | undefined>(undefined);

/** Reads the current authenticated user without loading organization memberships. */
export function useCurrentUser() {
    return useQuery({
        // Auth state must refresh immediately after login/logout redirects.
        queryKey: ['api', '/api/v1/me'],
        queryFn: async ({ signal }) => zUserSummary.parse(await api('/api/v1/me', { signal }).json()),
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });
}

/** Reads the user guaranteed by the authenticated route boundary. */
export function useAuthenticatedUser() {
    const user = useContext(AuthenticatedUserContext);

    // Fail clearly when a consumer is mounted outside the authenticated boundary.
    if (user === undefined) {
        throw new Error('useAuthenticatedUser must be used within an authenticated route');
    }

    return user;
}
