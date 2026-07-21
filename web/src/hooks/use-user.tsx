import { createContext, useContext } from 'react';
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { DEFAULT_RADIUS, type Accent, type Theme } from '@/lib/theme';
import type { ApiUserListItem, ApiUserOrganizationMembership, ApiUserProfile } from '@/lib/types';
import { useApiQuery } from '@/hooks/use-api';
import { fetchApiJson, fetchApiVoid } from '@/lib/api';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { accountsQueryKey, userOrganizationsQueryKey, userProfileQueryKey } from '@/lib/query-keys';
import {
    apiUserListItemSchema,
    apiUserOrganizationMembershipSchema,
    apiUserProfileSchema,
    parseApiCollection,
    parseApiResponse,
} from '@/lib/api-schemas';

export type User = ApiUserProfile;

type UserUpdate = Partial<Pick<User, 'name' | 'avatar' | 'theme' | 'accent' | 'radius' | 'language'>>;

type UserPreferences = Pick<User, 'theme' | 'accent' | 'radius' | 'language'>;

type UserQueryResult = UseQueryResult<User | null, Error>;

type AccountsState = {
    items: ApiUserListItem[];
    isLoading: boolean;
    error: Error | null;
};

type UserProfileState = {
    user: User | null;
    organizations: ApiUserOrganizationMembership[];
    role: User['role'];
    theme: User['theme'];
    accent: User['accent'];
    radius: User['radius'];
    language: User['language'];
    isLoading: boolean;
    error: Error | null;
};

const UserContext = createContext<UserQueryResult | undefined>(undefined);

const DEFAULT_USER_PREFERENCES = {
    theme: 'dark' as Theme,
    accent: 'neutral' as Accent,
    radius: DEFAULT_RADIUS,
    language: 'en',
} as const satisfies UserPreferences;

/** Hook that fetches the current user. */
function useUserQuery() {
    return useApiQuery<User | null>('/api/me', {
        // Auth state must refresh immediately after login/logout redirects.
        parse: (value) => (value === null ? null : parseApiResponse(apiUserProfileSchema, value)),
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });
}

/** Hook that fetches the current user's organization memberships. */
function useUserOrganizationsQuery(user: User | null | undefined) {
    return useApiQuery<ApiUserOrganizationMembership[]>(user ? '/api/me/organizations' : null, {
        parse: (value) => parseApiCollection(apiUserOrganizationMembershipSchema, value),
        retry: false,
    });
}

/** Provides the authenticated user query to the app tree. */
export function UserProvider({ children }: { children: React.ReactNode }) {
    const user = useUserQuery();

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Reads the current user profile without loading saved account switcher state. */
export function useUserProfile(): UserProfileState {
    // Fail fast when the provider is missing.
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserProfile must be used within a UserProvider');
    }

    const { data: user, error, isLoading } = context;
    const organizationsQuery = useUserOrganizationsQuery(user);

    // Return anonymous defaults when no authenticated user is loaded.
    if (!user) {
        return {
            user: null,
            organizations: [],
            role: 'user',
            theme: DEFAULT_USER_PREFERENCES.theme,
            accent: DEFAULT_USER_PREFERENCES.accent,
            radius: DEFAULT_USER_PREFERENCES.radius,
            language: DEFAULT_USER_PREFERENCES.language,
            isLoading,
            error: error ?? null,
        };
    }

    return {
        user,
        organizations: organizationsQuery.data ?? [],
        role: user.role,
        theme: user.theme,
        accent: user.accent,
        radius: user.radius,
        language: user.language,
        isLoading: isLoading || organizationsQuery.isLoading,
        error: error ?? organizationsQuery.error ?? null,
    };
}

/** Reads the normalized authenticated user state with saved account switcher state. */
export function useUser() {
    const profile = useUserProfile();
    const queryClient = useQueryClient();
    const accountsQuery = useCollectionQuery<ApiUserListItem>('/auth/accounts', {
        parse: (value) => parseApiCollection(apiUserListItemSchema, value),
        refetchOnMount: 'always',
        retry: false,
    });
    const accounts: AccountsState = {
        items: accountsQuery.items,
        isLoading: accountsQuery.isLoading || accountsQuery.isFetching,
        error: accountsQuery.error ?? null,
    };

    /** Signs the current user out and clears cached session state. */
    const signOut = async () => {
        await fetchApiVoid('/auth/logout', { method: 'POST' });
        queryClient.clear();
        window.location.assign('/organizations');
    };

    /** Activates one saved account and refreshes the current user session. */
    const activateAccount = async (id: string) => {
        await fetchApiVoid(`/auth/accounts/${encodeURIComponent(id)}/activate`, {
            method: 'POST',
        });

        queryClient.setQueryData(userOrganizationsQueryKey(), []);
        await queryClient.invalidateQueries({ queryKey: userProfileQueryKey() });
        await queryClient.invalidateQueries({ queryKey: userOrganizationsQueryKey() });
        await queryClient.invalidateQueries({ queryKey: accountsQueryKey() });
    };

    /** Clears the active user on the server so another account can be selected. */
    const switchAccount = async () => {
        const savedAccounts = await fetchApiJson(
            '/auth/accounts/deactivate',
            {
                method: 'POST',
            },
            (value) => parseApiCollection(apiUserListItemSchema, value)
        );

        await queryClient.cancelQueries({ queryKey: accountsQueryKey() });
        queryClient.setQueryData(accountsQueryKey(), savedAccounts);
        queryClient.setQueryData(userProfileQueryKey(), null);
        queryClient.setQueryData(userOrganizationsQueryKey(), []);
    };

    return {
        ...profile,
        accounts,
        signOut,
        activateAccount,
        switchAccount,
    };
}

/** Updates the current user profile. */
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: UserUpdate) => {
            return fetchApiJson(
                '/api/me',
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                (value) => parseApiResponse(apiUserProfileSchema, value)
            );
        },
        onSuccess: (user) => {
            queryClient.setQueryData(userProfileQueryKey(), user);
        },
    });
}
