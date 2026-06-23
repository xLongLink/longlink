import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

import { useApiQuery } from '@/hooks/use-api';
import { apiQueryKey, fetchApiJson, fetchApiVoid } from '@/lib/api';
import { applyTheme, THEME_PRESETS, type Accent, type Radius, type Theme, type ThemeConfig } from '@/lib/theme';
import type { ApiUserProfile } from '@/lib/types';

export type User = ApiUserProfile;

type UserUpdate = Partial<Pick<User, 'name' | 'email' | 'avatar' | 'theme' | 'accent' | 'radius' | 'language'>>;

type UserQueryResult = UseQueryResult<User | null, Error>;

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
        if (user.isLoading) {
            return;
        }

        if (user.data) {
            applyUserPreferences(user.data);
        }
    }, [user.data, user.isLoading]);

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Reads the normalized authenticated user state. */
export function useUser() {
    const context = useContext(UserContext);
    const queryClient = useQueryClient();

    if (!context) throw new Error('useUser must be used within a UserProvider');

    const user = context.data ?? null;
    const organizations = user?.organizations ?? [];

    /** Signs the current user out and clears cached session state. */
    const signOut = async () => {
        await fetchApiVoid('/auth/logout');
        queryClient.setQueryData(apiQueryKey('/api/me'), null);
        queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/me') });
    };

    return {
        user,
        organizations,
        role: user?.role ?? 'user',
        theme:
            user?.theme === 'system' ? DEFAULT_USER_PREFERENCES.theme : (user?.theme ?? DEFAULT_USER_PREFERENCES.theme),
        accent: user?.accent ?? DEFAULT_USER_PREFERENCES.accent,
        radius: user?.radius ?? DEFAULT_USER_PREFERENCES.radius,
        language: user?.language ?? DEFAULT_USER_PREFERENCES.language,
        isLoading: context.isLoading || context.isFetching,
        error: context.error ?? null,
        signOut,
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
