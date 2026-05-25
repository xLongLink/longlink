import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

import { ThemeProviderContext } from '@/components/Theme';
import { apiUrl } from '@/lib/api';
import { applyTheme, resetTheme, type Accent, type Radius, type Theme } from '@/lib/theme';

type UserUpdate = Partial<Pick<User, 'name' | 'email' | 'avatar' | 'theme' | 'accent' | 'radius' | 'language'>>;

export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    theme?: Theme;
    accent?: Accent;
    radius?: Radius;
    language?: string;
    oauth_github_id?: number | null;
    date_creation?: string;
    orgs?: {
        name: string;
    }[];
};

type UserQueryResult = UseQueryResult<User | null, Error>;

const UserContext = createContext<UserQueryResult | undefined>(undefined);

/** Applies user preferences to the document root. */
function applyUserPreferences(user: User) {
    const root = window.document.documentElement;

    applyTheme(root, user.theme ?? 'dark', {
        accent: user.accent ?? 'neutral',
        radius: user.radius ?? 'medium',
    });
    root.lang = user.language ?? 'en';
}

/** Resets document preferences back to the shared defaults. */
function resetUserPreferences() {
    const root = window.document.documentElement;

    resetTheme(root);
    root.lang = 'en';
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

            return (await response.json()) as User;
        },
        retry: false,
    });
}

/** Provides the authenticated user query to the app tree. */
export function UserProvider({ children }: { children: React.ReactNode }) {
    const user = useUserQuery();

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Reads the current user query state from context. */
export function useUser() {
    const context = useContext(UserContext);

    if (!context) throw new Error('useUser must be used within a UserProvider');

    return context;
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

            return (await response.json()) as User;
        },
        onSuccess: (user) => {
            queryClient.setQueryData(['api', userUrl], user);
        },
    });
}

/** Keeps document preferences in sync with the authenticated user. */
export function UserPreferencesSync() {
    const { data: user, isLoading } = useUser();

    useEffect(() => {
        if (isLoading) {
            return;
        }

        if (!user) {
            resetUserPreferences();
            return;
        }

        applyUserPreferences(user);
    }, [isLoading, user]);

    return null;
}

/** Signs the current user out and clears cached session state. */
export function useSignOut() {
    const queryClient = useQueryClient();
    const userUrl = apiUrl('/api/me');
    const logoutUrl = apiUrl('/auth/logout');

    return useMutation({
        mutationFn: () => fetch(logoutUrl, { credentials: 'include' }),
        /**
         * Clears the cached user after a successful sign-out.
         */
        onSuccess: () => {
            queryClient.setQueryData(['api', userUrl], null);
            queryClient.invalidateQueries({ queryKey: ['api', userUrl] });
        },
    });
}

/** Reads the active theme context. */
export function useTheme() {
    const context = useContext(ThemeProviderContext);

    if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

    return context;
}
