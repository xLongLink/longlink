import type { z } from 'zod';
import { api } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { createContext, useContext } from 'react';
import { currentUserKey, currentUserPath } from '@/lib/react-query';
import { zUserUpdate, zCurrentUser } from '@/lib/generated/platform-api-v1/zod.gen';
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

// Share the account provider's identity observer across public and protected routes.
export const CurrentUserContext = createContext<UseQueryResult<z.output<typeof zCurrentUser> | null> | undefined>(
    undefined
);

/** Reads the account provider's identity query without creating another observer. */
export function useCurrentUser() {
    const user = useContext(CurrentUserContext);

    // Keep identity ownership at the account provider rather than silently adding a query.
    if (user === undefined) {
        throw new Error('useCurrentUser must be used within AccountProvider');
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
            await queryClient.cancelQueries({ queryKey: currentUserKey, exact: true });

            // Preview appearance only when this serialized write starts, leaving other profile fields unchanged.
            const previous = queryClient.getQueryData<z.output<typeof zCurrentUser>>(currentUserKey);

            const preview =
                previous && update.theme
                    ? queryClient.setQueryData(currentUserKey, { ...previous, theme: update.theme })
                    : undefined;

            try {
                return await api.patch(currentUserPath, { json: update }).json(zCurrentUser);
            } catch (error) {
                // A newer account response must not be replaced by this attempt's rollback.
                if (preview && queryClient.getQueryData(currentUserKey) === preview) {
                    queryClient.setQueryData(currentUserKey, previous);
                }

                throw error;
            }
        },
        onSuccess: async (user) => {
            await queryClient.cancelQueries({ queryKey: currentUserKey, exact: true });
            queryClient.setQueryData(currentUserKey, user);
        },
        onError: reportError
    });
}

/** Reads the authenticated account without creating another query observer. */
export function useAuthenticatedUser() {
    const { data: user } = useCurrentUser();

    if (!user) {
        throw new Error('useAuthenticatedUser requires an authenticated account');
    }

    return user;
}
