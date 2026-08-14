import { createContext, useContext } from 'react';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { UserOrganizationMembership, UserSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { fetchApiVoid } from '@/lib/api';
import { useApiQuery } from '@/hooks/use-api';
import { platformApiPath } from '@/lib/platform-api';
import { zUserOrganizationMembership, zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

const UserContext = createContext<UseQueryResult<UserSummary, Error> | undefined>(undefined);

/** Provides the authenticated user query to the app tree. */
export function UserProvider({ children }: { children: React.ReactNode }) {
    const user = useApiQuery<UserSummary>(platformApiPath('/me'), {
        // Auth state must refresh immediately after login/logout redirects.
        parse: (value) => zUserSummary.parse(value),
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Reads the current user profile and organization memberships. */
export function useUserProfile() {
    // Fail fast when the provider is missing.
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserProfile must be used within a UserProvider');
    }

    const { data: user, error, isLoading, refetch } = context;
    const organizations = useApiQuery<UserOrganizationMembership[]>(
        user ? platformApiPath('/me/organizations') : null,
        {
            parse: (value) => zUserOrganizationMembership.array().parse(value),
        }
    );

    return {
        user: user ?? null,
        memberships: organizations.data ?? [],
        isLoading,
        isOrganizationsLoading: organizations.isLoading,
        error: error ?? null,
        organizationsError: organizations.error ?? null,
        refetch,
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
