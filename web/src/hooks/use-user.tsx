import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

import { apiUrl } from '@/lib/api';
import {
    applyTheme,
    resetTheme,
    THEME_PRESETS,
    type Accent,
    type ThemeConfig,
    type Radius,
    type Theme,
} from '@/lib/theme';

type UserUpdate = Partial<Pick<User, 'name' | 'email' | 'avatar' | 'theme' | 'accent' | 'radius' | 'language'>>;

export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    theme: Theme;
    accent: Accent;
    radius: Radius;
    language: string;
    oauth_github_id?: number | null;
    date_creation?: string;
    orgs?: {
        name: string;
    }[];
};

type UserResponse = Omit<User, 'theme' | 'accent' | 'radius' | 'language'> & {
    theme?: Theme | null;
    accent?: Accent | null;
    radius?: Radius | null;
    language?: string | null;
};

type UserQueryResult = UseQueryResult<User | null, Error>;

const UserContext = createContext<UserQueryResult | undefined>(undefined);

type UserPreferenceInput = {
    theme?: Theme | null;
    accent?: Accent | null;
    radius?: Radius | null;
    language?: string | null;
};

type ResolvedUserPreferences = {
    theme: Exclude<Theme, 'system'>;
    accent: Accent;
    radius: Radius;
    language: string;
};

const DEFAULT_USER_PREFERENCES = {
    theme: 'dark' as Exclude<Theme, 'system'>,
    accent: 'neutral' as Accent,
    radius: 'medium' as Radius,
    language: 'en',
} as const;

/** Resolves missing preference values to the shared defaults. */
function resolveUserPreferences(user: UserPreferenceInput | null | undefined): ResolvedUserPreferences {
    return {
        theme: user?.theme === 'system' ? DEFAULT_USER_PREFERENCES.theme : user?.theme ?? DEFAULT_USER_PREFERENCES.theme,
        accent: user?.accent ?? DEFAULT_USER_PREFERENCES.accent,
        radius: user?.radius ?? DEFAULT_USER_PREFERENCES.radius,
        language: user?.language ?? DEFAULT_USER_PREFERENCES.language,
    };
}

/** Normalizes a user payload with shared preference defaults. */
function normalizeUser(user: UserResponse): User {
    return {
        ...user,
        ...resolveUserPreferences(user),
    };
}

/** Applies user preferences to the document root. */
function applyUserPreferences(user: User) {
    const root = window.document.documentElement;
    const resolvedUserPreferences = resolveUserPreferences(user);
    const config: ThemeConfig = {
        theme: resolvedUserPreferences.theme,
        ...THEME_PRESETS[resolvedUserPreferences.theme],
        accent: resolvedUserPreferences.accent,
        radius: resolvedUserPreferences.radius,
    };

    applyTheme(root, config);
    root.lang = resolvedUserPreferences.language;
}

/** Resets document preferences back to the shared defaults. */
function resetUserPreferences() {
    const root = window.document.documentElement;

    resetTheme(root);
    root.lang = DEFAULT_USER_PREFERENCES.language;
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

            return normalizeUser((await response.json()) as UserResponse);
        },
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

        if (!user.data) {
            resetUserPreferences();
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

    if (!context) throw new Error('useUser must be used within a UserProvider');

    const user = context.data ?? null;
    const resolvedUser = resolveUserPreferences(user);
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
        theme: resolvedUser.theme,
        accent: resolvedUser.accent,
        radius: resolvedUser.radius,
        language: resolvedUser.language,
        isLoading: context.isLoading,
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

            return normalizeUser((await response.json()) as UserResponse);
        },
        onSuccess: (user) => {
            queryClient.setQueryData(['api', userUrl], user);
        },
    });
}
