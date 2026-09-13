import { api } from '@/lib/api';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import { skipToken, useMutation, useQuery } from '@tanstack/react-query';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';

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
    const { data: user } = useQuery<UserSummary>({ queryKey: ['api', '/api/v1/me'], queryFn: skipToken });
    if (user === undefined) {
        throw new Error('useAuthenticatedUser must be used within an authenticated route');
    }

    return user;
}

/** Provides an action that ends the current user session. */
export function useSignOut() {
    return useMutation({
        mutationFn: () => api('/api/v1/auth/logout', { method: 'POST' }),
        onSuccess: () => {
            // A full navigation disposes the query cache without exposing a transient unauthenticated render.
            window.location.assign('/user/organizations');
        },
    });
}
