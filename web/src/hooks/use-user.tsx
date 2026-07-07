import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

import { useApiQuery } from '@/hooks/use-api';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { apiQueryKey, fetchApiJson, fetchApiVoid } from '@/lib/api';
import { accountsQueryKey } from '@/lib/query-keys';
import {
    applyTheme,
    resolveTheme,
    THEME_PRESETS,
    type Accent,
    type Radius,
    type Theme,
    type ThemeConfig,
} from '@/lib/theme';
import type { ApiUserProfile, ApiUserSummary } from '@/lib/types';

export type User = ApiUserProfile;

type UserUpdate = Partial<Pick<User, 'name' | 'avatar' | 'theme' | 'accent' | 'radius' | 'language'>>;

type UserPreferences = Pick<User, 'theme' | 'accent' | 'radius' | 'language'>;

type UserQueryResult = UseQueryResult<User | null, Error>;

type AccountsState = {
    items: ApiUserSummary[];
    isLoading: boolean;
    error: Error | null;
};

type UserProfileState = {
    user: User | null;
    organizations: User['organizations'];
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
    radius: 'medium' as Radius,
    language: 'en',
} as const satisfies UserPreferences;

/** Applies user preferences to the document root. */
function applyUserPreferences(preferences: UserPreferences) {
    const root = window.document.documentElement;
    const resolvedTheme = resolveTheme(preferences.theme);

    const config: ThemeConfig = {
        theme: preferences.theme,
        ...THEME_PRESETS[resolvedTheme],
        accent: preferences.accent,
        radius: preferences.radius,
    };

    applyTheme(root, config);
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
        if (user.isLoading) {
            return;
        }

        const preferences = user.data ?? DEFAULT_USER_PREFERENCES;

        applyUserPreferences(preferences);

        if (preferences.theme !== 'system') {
            return;
        }

        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

        /** Re-applies user preferences when the operating system theme changes. */
        const handleSystemThemeChange = () => {
            applyUserPreferences(preferences);
        };

        systemTheme.addEventListener('change', handleSystemThemeChange);

        return () => {
            systemTheme.removeEventListener('change', handleSystemThemeChange);
        };
    }, [user.data, user.isLoading]);

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Reads the current user profile without loading saved account switcher state. */
export function useUserProfile(): UserProfileState {
    const context = useContext(UserContext);

    if (context === undefined) {
        throw new Error('useUserProfile must be used within a UserProvider');
    }

    const { data: user, error, isFetching, isLoading } = context;

    if (!user) {
        return {
            user: null,
            organizations: [],
            role: 'user',
            theme: DEFAULT_USER_PREFERENCES.theme,
            accent: DEFAULT_USER_PREFERENCES.accent,
            radius: DEFAULT_USER_PREFERENCES.radius,
            language: DEFAULT_USER_PREFERENCES.language,
            isLoading: isLoading || isFetching,
            error: error ?? null,
        };
    }

    return {
        user,
        organizations: user.organizations,
        role: user.role,
        theme: user.theme,
        accent: user.accent,
        radius: user.radius,
        language: user.language,
        isLoading: isLoading || isFetching,
        error: error ?? null,
    };
}

/** Reads the normalized authenticated user state with saved account switcher state. */
export function useUser() {
    const profile = useUserProfile();
    const queryClient = useQueryClient();
    const accountsQuery = useCollectionQuery<ApiUserSummary>('/auth/accounts', {
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
