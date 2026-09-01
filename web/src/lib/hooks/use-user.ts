import { api } from '@/lib/api';
import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { zUserOrganizationMembership, zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

export const AuthenticatedUserContext = createContext<UserSummary | null>(null);

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
    const user = useContext(AuthenticatedUserContext);
    if (user === null) {
        throw new Error('useAuthenticatedUser must be used within an authenticated route');
    }

    return user;
}

/** Reads organization memberships for the authenticated user. */
export function useUserOrganizations() {
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
