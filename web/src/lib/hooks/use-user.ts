import type { z } from 'zod';
import { api } from '@/lib/api';
import { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zUserUpdate, zCurrentUser } from '@/lib/generated/platform-api-v1/zod.gen';

// Share the user validated by the authenticated route boundary.
export const AuthenticatedUserContext = createContext<z.output<typeof zCurrentUser> | undefined>(undefined);

/** Reads the current authenticated user without loading organization memberships. */
export function useCurrentUser() {
    return useQuery({
        // Auth state must refresh immediately after login/logout redirects.
        queryKey: ['api', '/api/v1/me'],
        queryFn: ({ signal }) => api('/api/v1/me', { signal }).json(zCurrentUser),
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });
}

/** Serializes profile writes and caches their validated responses across account controls. */
export function useUpdateUser() {
    const queryClient = useQueryClient();

    // Share a scope so overlapping controls cannot publish older profile snapshots out of order.
    return useMutation({
        scope: { id: 'current-user' },
        networkMode: 'always',
        mutationFn: async (payload: z.input<typeof zUserUpdate>) => {
            await queryClient.cancelQueries({ queryKey: ['api', '/api/v1/me'], exact: true });

            return api.patch('/api/v1/me', { json: zUserUpdate.parse(payload) }).json(zCurrentUser);
        },
        onSuccess: async (user) => {
            await queryClient.cancelQueries({ queryKey: ['api', '/api/v1/me'], exact: true });
            queryClient.setQueryData(['api', '/api/v1/me'], user);
        },
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
