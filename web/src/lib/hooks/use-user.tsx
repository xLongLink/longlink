import { createContext, useContext } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { api } from '@/lib/api';
import { zUserOrganizationMembership, zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

const UserContext = createContext<UseQueryResult<UserSummary, Error> | undefined>(undefined);
const AuthenticatedUserContext = createContext<UserSummary | undefined>(undefined);

/** Provides the authenticated user query to the app tree. */
export function UserProvider({ children }: { children: React.ReactNode }) {
    const user = useQuery({
        // Auth state must refresh immediately after login/logout redirects.
        queryKey: ['api', '/api/v1/me'],
        queryFn: async ({ signal }) => zUserSummary.parse(await api('/api/v1/me', { signal }).json()),
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Reads the current authenticated user without loading organization memberships. */
export function useCurrentUser() {
    // Fail fast when the provider is missing.
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useCurrentUser must be used within a UserProvider');
    }

    const { data: user, error, isLoading, refetch } = context;
    return {
        user,
        isLoading,
        error: error ?? null,
        refetch,
    };
}

/** Provides the authenticated user to routes protected by Auth. */
export function AuthenticatedUserProvider({ children, user }: { children: React.ReactNode; user: UserSummary }) {
    return <AuthenticatedUserContext.Provider value={user}>{children}</AuthenticatedUserContext.Provider>;
}

/** Reads the user guaranteed by the authenticated route boundary. */
export function useAuthenticatedUser() {
    const user = useContext(AuthenticatedUserContext);
    if (user === undefined) {
        throw new Error('useAuthenticatedUser must be used within an AuthenticatedUserProvider');
    }

    return user;
}

/** Reads the current user profile and organization memberships. */
export function useUserProfile() {
    const user = useAuthenticatedUser();
    const organizations = useQuery({
        queryKey: ['api', '/api/v1/me/organizations'],
        queryFn: async ({ signal }) =>
            zUserOrganizationMembership.array().parse(await api('/api/v1/me/organizations', { signal }).json()),
    });

    return {
        user,
        memberships: organizations.data ?? [],
        isOrganizationsLoading: organizations.isLoading,
        organizationsError: organizations.error ?? null,
    };
}

/** Provides an action that ends the current user session. */
export function useSignOut() {
    const queryClient = useQueryClient();

    return async () => {
        await api('/api/v1/auth/logout', { method: 'POST' });
        queryClient.clear();
        window.location.assign('/organizations');
    };
}
