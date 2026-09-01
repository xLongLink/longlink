import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zUserOrganizationMembership, zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

/** Reads the current authenticated user without loading organization memberships. */
export function useCurrentUser() {
    const {
        data: user,
        error,
        isLoading,
        refetch,
    } = useQuery({
        // Auth state must refresh immediately after login/logout redirects.
        queryKey: ['api', '/api/v1/me'],
        queryFn: async ({ signal }) => zUserSummary.parse(await api('/api/v1/me', { signal }).json()),
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });

    return {
        user,
        isLoading,
        error,
        refetch,
    };
}

/** Reads the user guaranteed by the authenticated route boundary. */
export function useAuthenticatedUser() {
    const { user } = useCurrentUser();
    if (user === undefined) {
        throw new Error('useAuthenticatedUser must be used within an authenticated route');
    }

    return user;
}

/** Reads the current user profile and organization memberships. */
export function useUserProfile() {
    const user = useAuthenticatedUser();
    const {
        data: memberships,
        error: organizationsError,
        isLoading: isOrganizationsLoading,
    } = useQuery({
        queryKey: ['api', '/api/v1/me/organizations'],
        queryFn: async ({ signal }) =>
            zUserOrganizationMembership.array().parse(await api('/api/v1/me/organizations', { signal }).json()),
    });

    return {
        user,
        memberships: memberships ?? [],
        isOrganizationsLoading,
        organizationsError,
    };
}

/** Provides an action that ends the current user session. */
export function useSignOut() {
    const queryClient = useQueryClient();

    return async () => {
        await api('/api/v1/auth/logout', { method: 'POST' });
        queryClient.clear();
        window.location.assign('/user/organizations');
    };
}
