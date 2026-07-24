import { createContext, useContext, useEffect } from 'react';
import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { ApiUserListItem, ApiUserOrganizationMembership, ApiUserProfile } from '@/lib/types';
import { useApiQuery } from '@/hooks/use-api';
import { fetchApiJson, fetchApiVoid } from '@/lib/api';
import { clearSessionQueries } from '@/lib/react-query';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { accountsQueryKey, userProfileQueryKey } from '@/lib/query-keys';
import { DEFAULT_RADIUS, THEME_PREFERENCES_KEY, type Accent, type Theme } from '@/lib/theme';
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

type StoredThemePreferences = Pick<User, 'theme' | 'accent' | 'radius'>;

type UserQueryResult = UseQueryResult<User | null, Error>;

type AccountsState = {
    items: ApiUserListItem[];
    isLoading: boolean;
    error: Error | null;
};

type UserProfileState = {
    user: User | null;
    role: User['role'];
    theme: User['theme'];
    accent: User['accent'];
    radius: User['radius'];
    language: User['language'];
    isLoading: boolean;
    error: Error | null;
};

type UserOrganizationsState = {
    organizations: ApiUserOrganizationMembership[];
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

/** Caches non-sensitive theme preferences for the next page's first paint. */
function storeThemePreferences({ theme, accent, radius }: StoredThemePreferences): void {
    localStorage.setItem(THEME_PREFERENCES_KEY, JSON.stringify({ theme, accent, radius }));
}

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

/** Provides the authenticated user query to the app tree. */
export function UserProvider({ children }: { children: React.ReactNode }) {
    const user = useUserQuery();

    // Synchronize the browser cache with the server-backed active session.
    useEffect(() => {
        if (user.data) {
            storeThemePreferences(user.data);
        } else if (user.data === null) {
            localStorage.removeItem(THEME_PREFERENCES_KEY);
        }
    }, [user.data]);

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Reads the current user profile without loading memberships or saved accounts. */
export function useUserProfile(): UserProfileState {
    // Fail fast when the provider is missing.
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserProfile must be used within a UserProvider');
    }

    const { data: user, error, isLoading } = context;

    // Return anonymous defaults when no authenticated user is loaded.
    if (!user) {
        return {
            user: null,
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
        role: user.role,
        theme: user.theme,
        accent: user.accent,
        radius: user.radius,
        language: user.language,
        isLoading,
        error: error ?? null,
    };
}

/** Reads organization memberships only when a user is authenticated. */
export function useUserOrganizations(): UserOrganizationsState {
    const profile = useUserProfile();
    const query = useCollectionQuery<ApiUserOrganizationMembership>(profile.user ? '/api/me/organizations' : null, {
        parse: (value) => parseApiCollection(apiUserOrganizationMembershipSchema, value),
        retry: false,
    });

    return {
        organizations: query.items,
        isLoading: profile.isLoading || (profile.user !== null && query.isLoading),
        error: profile.error ?? query.error ?? null,
    };
}

/** Reads accounts previously authenticated in this browser session. */
export function useSavedAccounts(): AccountsState {
    const accountsQuery = useCollectionQuery<ApiUserListItem>('/api/auth/accounts', {
        parse: (value) => parseApiCollection(apiUserListItemSchema, value),
        refetchOnMount: 'always',
        retry: false,
    });

    return {
        items: accountsQuery.items,
        isLoading: accountsQuery.isLoading || accountsQuery.isFetching,
        error: accountsQuery.error ?? null,
    };
}

/** Provides actions that end or deactivate the current user session. */
export function useUserSessionActions() {
    const queryClient = useQueryClient();

    /** Signs the current user out and clears cached session state. */
    const signOut = async () => {
        await fetchApiVoid('/api/auth/logout', { method: 'POST' });
        queryClient.clear();
        localStorage.removeItem(THEME_PREFERENCES_KEY);
        window.location.assign('/organizations');
    };

    /** Clears the active user on the server so another account can be selected. */
    const switchAccount = async () => {
        const savedAccounts = await fetchApiJson(
            '/api/auth/accounts/deactivate',
            {
                method: 'POST',
            },
            (value) => parseApiCollection(apiUserListItemSchema, value)
        );

        const profileKey = userProfileQueryKey();
        const accountsKey = accountsQueryKey();

        // Remove every query owned by the deactivated account before showing account selection.
        await clearSessionQueries(queryClient, [profileKey, accountsKey]);
        queryClient.setQueryData(accountsKey, savedAccounts);
        queryClient.setQueryData(profileKey, null);
        localStorage.removeItem(THEME_PREFERENCES_KEY);
    };

    return {
        signOut,
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
            storeThemePreferences(user);
            queryClient.setQueryData(userProfileQueryKey(), user);
        },
    });
}
