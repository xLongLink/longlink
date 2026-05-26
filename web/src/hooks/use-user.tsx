import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

import { apiUrl } from '@/lib/api';
import type { ApiResponse, ApiUserProfile } from '@/lib/types';
import {
    applyTheme,
    THEME_PRESETS,
    type Accent,
    type ThemeConfig,
    type Radius,
    type Theme,
} from '@/lib/theme';

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
    const userUrl = apiUrl('/api/me');

    return useQuery<User | null, Error>({
        queryKey: ['api', userUrl],
        queryFn: async () => {
            const response = await fetch(userUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const responsePayload = (await response.json()) as ApiResponse<User>;

            if (!responsePayload.data) {
                throw new Error('Unexpected response format');
            }

            return responsePayload.data;
        },
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
    const orgs = user?.orgs ?? [];
    const userUrl = apiUrl('/api/me');

    /** Signs the current user out and clears cached session state. */
    const signOut = async () => {
        const response = await fetch(apiUrl('/auth/logout'), { credentials: 'include' });

        if (!response.ok) {
            throw new Error(`API request failed (${response.status})`);
        }

        queryClient.setQueryData(['api', userUrl], null);
        queryClient.invalidateQueries({ queryKey: ['api', userUrl] });
    };

    return {
        user,
        orgs,
        theme: user?.theme === 'system' ? DEFAULT_USER_PREFERENCES.theme : user?.theme ?? DEFAULT_USER_PREFERENCES.theme,
        accent: user?.accent ?? DEFAULT_USER_PREFERENCES.accent,
        radius: user?.radius ?? DEFAULT_USER_PREFERENCES.radius,
        language: user?.language ?? DEFAULT_USER_PREFERENCES.language,
        isLoading: context.isLoading,
        isFetching: context.isFetching,
        error: context.error ?? null,
        signOut,
    };
}

/** Updates the current user profile. */
export function useUpdateUser() {
    const queryClient = useQueryClient();
    const userUrl = apiUrl('/api/me');

    return useMutation({
        mutationFn: async (payload: UserUpdate) => {
            const response = await fetch(userUrl, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const responsePayload = (await response.json()) as ApiResponse<User>;

            if (!responsePayload.data) {
                throw new Error('Unexpected response format');
            }

            return responsePayload.data;
        },
        onSuccess: (user) => {
            queryClient.setQueryData(['api', userUrl], user);
        },
    });
}
