import { createContext, useContext } from 'react';
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { UserOrganizationMembership, UserProfile, UserUpdate } from '@/lib/generated/platform-api-v1/types.gen';
import { useApiQuery } from '@/hooks/use-api';
import { platformApiPath } from '@/lib/platform-api';
import { fetchApiJson, fetchApiVoid } from '@/lib/api';
import { userProfileQueryKey } from '@/lib/query-keys';
import { zUserOrganizationMembership, zUserProfile } from '@/lib/generated/platform-api-v1/zod.gen';

const UserContext = createContext<UseQueryResult<UserProfile, Error> | undefined>(undefined);

/** Provides the authenticated user query to the app tree. */
export function UserProvider({ children }: { children: React.ReactNode }) {
    const user = useApiQuery<UserProfile>(platformApiPath('/me'), {
        // Auth state must refresh immediately after login/logout redirects.
        parse: (value) => zUserProfile.parse(value),
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Reads the current user profile without loading memberships or saved accounts. */
export function useUserProfile() {
    // Fail fast when the provider is missing.
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserProfile must be used within a UserProvider');
    }

    const { data: user, error, isLoading, refetch } = context;

    return {
        user: user ?? null,
        isLoading,
        error: error ?? null,
        refetch,
    };
}

/** Reads organization memberships only when a user is authenticated. */
export function useUserOrganizations() {
    const profile = useUserProfile();
    const query = useApiQuery<UserOrganizationMembership[]>(
        profile.user ? platformApiPath('/me/organizations') : null,
        {
            parse: (value) => zUserOrganizationMembership.array().parse(value),
        }
    );

    return {
        memberships: query.data ?? [],
        isLoading: profile.isLoading || query.isLoading,
        error: profile.error ?? query.error ?? null,
    };
}

/** Provides an action that ends the current user session. */
export function useSignOut() {
    const queryClient = useQueryClient();

    return async () => {
        await fetchApiVoid(platformApiPath('/auth/logout'), { method: 'POST' });
        queryClient.clear();
        window.location.assign('/organizations');
    };
}

/** Updates the current user profile. */
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UserUpdate) =>
            fetchApiJson(
                platformApiPath('/me'),
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                (value) => zUserProfile.parse(value)
            ),
        onSuccess: (user) => {
            queryClient.setQueryData(userProfileQueryKey, user);
        },
    });
}
