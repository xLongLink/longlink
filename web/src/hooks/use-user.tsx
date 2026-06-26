import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

import { useCollectionQuery } from '@/hooks/use-collection-query';
import { useApiQuery } from '@/hooks/use-api';
import { apiQueryKey, fetchApiJson, fetchApiVoid } from '@/lib/api';
import { accountsQueryKey } from '@/lib/query-keys';
import { applyTheme, THEME_PRESETS, type Accent, type Radius, type Theme, type ThemeConfig } from '@/lib/theme';
import type { ApiUserProfile, ApiUserSummary } from '@/lib/types';

export type User = ApiUserProfile;

type UserUpdate = Partial<Pick<User, 'name' | 'email' | 'avatar' | 'theme' | 'accent' | 'radius' | 'language'>>;

type LoginCredentials = {
    username: string;
    password: string;
};

type UserQueryResult = UseQueryResult<User | null, Error>;

type AccountsState = {
    items: ApiUserSummary[];
    isLoading: boolean;
    error: Error | null;
};

const UserContext = createContext<UserQueryResult | undefined>(undefined);

const DEFAULT_USER_PREFERENCES = {
    theme: 'dark' as Exclude<Theme, 'system'>,
    accent: 'neutral' as Accent,
    radius: 'medium' as Radius,
    language: 'en',
} as const;

/** Applies user preferences to the document root. */
function applyUserPreferences(user: User) {
    const root = window.document.documentElement;
    const theme = user.theme === 'system' ? DEFAULT_USER_PREFERENCES.theme : user.theme;

    const config: ThemeConfig = {
        theme,
        ...THEME_PRESETS[theme],
        accent: user.accent,
        radius: user.radius,
    };

    applyTheme(root, config);
    root.lang = user.language;
}

/** Hook that fetches the current user. */
function useUserQuery() {
    return useApiQuery<User | null>('/api/me', {
        // Auth state must refresh immediately after login/logout redirects.
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });
}

/** Provides the authenticated user query to the app tree. */
export function UserProvider({ children }: { children: React.ReactNode }) {
    const user = useUserQuery();

    useEffect(() => {
        if (user.isLoading || !user.data) {
            return;
        }

        applyUserPreferences(user.data);
    }, [user.data, user.isLoading]);

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Reads the normalized authenticated user state. */
export function useUser() {
    const context = useContext(UserContext);
    const queryClient = useQueryClient();
    const accountsQuery = useCollectionQuery<ApiUserSummary>('/accounts', {
        refetchOnMount: 'always',
        retry: false,
    });

    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }

    const { data: user, error, isFetching, isLoading } = context;
    const accounts: AccountsState = {
        items: accountsQuery.items,
        isLoading: accountsQuery.isLoading || accountsQuery.isFetching,
        error: accountsQuery.error ?? null,
    };

    /** Signs the current user out and clears cached session state. */
    const signOut = async () => {
        await fetchApiVoid('/auth/logout');
        queryClient.clear();
        window.location.assign('/organizations');
    };

    /** Signs in with username and password and refreshes the current session. */
    const loginWithCredentials = async ({ username, password }: LoginCredentials) => {
        await fetchApiVoid('/auth/login/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password,
            }),
        });

        await queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/me') });
        await queryClient.invalidateQueries({ queryKey: accountsQueryKey() });
    };

    /** Activates one saved account and refreshes the current user session. */
    const activateAccount = async (oidc: string) => {
        await fetchApiJson<{ ok: boolean }>(`/auth/accounts/${encodeURIComponent(oidc)}/activate`, {
            method: 'POST',
        });

        await queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/me') });
        await queryClient.invalidateQueries({ queryKey: accountsQueryKey() });
    };

    /** Clears the active user on the server so another account can be selected. */
    const switchAccount = async () => {
        const savedAccounts = await fetchApiJson<ApiUserSummary[]>('/auth/accounts/deactivate', {
            method: 'POST',
        });

        await queryClient.cancelQueries({ queryKey: accountsQueryKey() });
        queryClient.setQueryData(accountsQueryKey(), savedAccounts);
        queryClient.setQueryData(apiQueryKey('/api/me'), null);
    };

    if (!user) {
        return {
            user: null,
            accounts,
            organizations: [],
            role: 'user',
            theme: DEFAULT_USER_PREFERENCES.theme,
            accent: DEFAULT_USER_PREFERENCES.accent,
            radius: DEFAULT_USER_PREFERENCES.radius,
            language: DEFAULT_USER_PREFERENCES.language,
            isLoading: isLoading || isFetching,
            error: error ?? null,
            signOut,
            loginWithCredentials,
            activateAccount,
            switchAccount,
        };
    }

    return {
        user,
        accounts,
        organizations: user.organizations,
        role: user.role,
        theme: user.theme === 'system' ? DEFAULT_USER_PREFERENCES.theme : user.theme,
        accent: user.accent,
        radius: user.radius,
        language: user.language,
        isLoading: isLoading || isFetching,
        error: error ?? null,
        signOut,
        loginWithCredentials,
        activateAccount,
        switchAccount,
    };
}

/** Updates the current user profile. */
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: UserUpdate) => {
            return fetchApiJson<User>('/api/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        },
        onSuccess: (user) => {
            queryClient.setQueryData(apiQueryKey('/api/me'), user);
        },
    });
}
