import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

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
    const { data: user } = useCurrentUser();
    if (user === undefined) {
        throw new Error('useAuthenticatedUser must be used within an authenticated route');
    }

    return user;
}
