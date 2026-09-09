import { api } from '@/lib/api';
import { createContext, useContext } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserSummary, UserUpdate } from '@/lib/generated/platform-api-v1/types.gen';
import { zUserOrganizationMembership, zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

export const AuthenticatedUserContext = createContext<UserSummary | null>(null);

/** Updates the current profile and publishes the saved user to the cache. */
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: UserUpdate) =>
            zUserSummary.parse(await api('/api/v1/me', { json: payload, method: 'PATCH' }).json()),
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(['api', '/api/v1/me'], updatedUser);
        },
    });
}

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
    if (user === null) {
        throw new Error('useAuthenticatedUser must be used within an authenticated route');
    }

    return user;
}

/** Reads organization memberships for the authenticated user. */
export function useUserOrganizations() {
    return useQuery({
        queryKey: ['api', '/api/v1/me/organizations'],
        queryFn: async ({ signal }) =>
            zUserOrganizationMembership.array().parse(await api('/api/v1/me/organizations', { signal }).json()),
    });
}

/** Provides an action that ends the current user session. */
export function useSignOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api('/api/v1/auth/logout', { method: 'POST' }),
        onSuccess: () => {
            queryClient.clear();
            window.location.assign('/user/organizations');
        },
    });
}
