import type { z } from 'zod';
import { api } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { createContext, useContext } from 'react';
import { zUserUpdate, zCurrentUser } from '@/lib/generated/platform-api-v1/zod.gen';
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

// Share the user validated by the authenticated route boundary.
export const AuthenticatedUserContext = createContext<z.output<typeof zCurrentUser> | undefined>(undefined);

// Share the account provider's identity observer across public and protected routes.
export const CurrentUserContext = createContext<UseQueryResult<z.output<typeof zCurrentUser> | null> | undefined>(
    undefined
);

/** Reads the account provider's identity query without creating another observer. */
export function useCurrentUser() {
    const user = useContext(CurrentUserContext);

    // Keep identity ownership at the account provider rather than silently adding a query.
    if (user === undefined) {
        throw new Error('useCurrentUser must be used within AccountAppearanceProvider');
    }

    return user;
}

/** Serializes profile writes and caches their validated responses across account controls. */
export function useUpdateUser() {
    const queryClient = useQueryClient();
    const reportError = useApiError();

    // Share a scope so overlapping controls cannot publish older profile snapshots out of order.
    return useMutation({
        scope: { id: 'current-user' },
        mutationKey: ['current-user'],
        networkMode: 'always',
        mutationFn: async (payload: z.input<typeof zUserUpdate>) => {
            const update = zUserUpdate.parse(payload);
            await queryClient.cancelQueries({ queryKey: ['api', '/api/v1/me'], exact: true });

            // Preview appearance only when this serialized write starts, leaving other profile fields unchanged.
            const previous = queryClient.getQueryData<z.output<typeof zCurrentUser>>(['api', '/api/v1/me']);

            const preview =
                previous && (update.theme || update.accent)
                    ? queryClient.setQueryData(['api', '/api/v1/me'], {
                          ...previous,
                          theme: update.theme ?? previous.theme,
                          accent: update.accent ?? previous.accent
                      })
                    : undefined;

            try {
                return await api.patch('/api/v1/me', { json: update }).json(zCurrentUser);
            } catch (error) {
                // A newer account response must not be replaced by this attempt's rollback.
                if (preview && queryClient.getQueryData(['api', '/api/v1/me']) === preview) {
                    queryClient.setQueryData(['api', '/api/v1/me'], previous);
                }

                throw error;
            }
        },
        onSuccess: async (user) => {
            await queryClient.cancelQueries({ queryKey: ['api', '/api/v1/me'], exact: true });
            queryClient.setQueryData(['api', '/api/v1/me'], user);
        },
        onError: reportError
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
