import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

type Theme = 'dark' | 'light' | 'system';

type Accent =
    | 'slate'
    | 'gray'
    | 'zinc'
    | 'neutral'
    | 'stone'
    | 'red'
    | 'orange'
    | 'amber'
    | 'yellow'
    | 'lime'
    | 'green'
    | 'emerald'
    | 'teal'
    | 'cyan'
    | 'sky'
    | 'blue'
    | 'indigo'
    | 'violet'
    | 'purple'
    | 'fuchsia'
    | 'pink'
    | 'rose';

type Radius = 'none' | 'small' | 'medium' | 'large';

type UserUpdate = Partial<
    Pick<User, 'name' | 'email' | 'avatar' | 'theme' | 'accent' | 'radius' | 'language'>
>;

type PreferenceToken = {
    accent: string;
    accentForeground: string;
};

const ACCENT_TOKENS: Record<Accent, PreferenceToken> = {
    slate: { accent: '#64748b', accentForeground: '#f8fafc' },
    gray: { accent: '#6b7280', accentForeground: '#f8fafc' },
    zinc: { accent: '#71717a', accentForeground: '#f8fafc' },
    neutral: { accent: '#737373', accentForeground: '#f8fafc' },
    stone: { accent: '#78716c', accentForeground: '#f8fafc' },
    red: { accent: '#ef4444', accentForeground: '#0f172a' },
    orange: { accent: '#f97316', accentForeground: '#0f172a' },
    amber: { accent: '#f59e0b', accentForeground: '#0f172a' },
    yellow: { accent: '#eab308', accentForeground: '#0f172a' },
    lime: { accent: '#84cc16', accentForeground: '#0f172a' },
    green: { accent: '#22c55e', accentForeground: '#0f172a' },
    emerald: { accent: '#10b981', accentForeground: '#0f172a' },
    teal: { accent: '#14b8a6', accentForeground: '#0f172a' },
    cyan: { accent: '#06b6d4', accentForeground: '#0f172a' },
    sky: { accent: '#0ea5e9', accentForeground: '#0f172a' },
    blue: { accent: '#3b82f6', accentForeground: '#f8fafc' },
    indigo: { accent: '#6366f1', accentForeground: '#f8fafc' },
    violet: { accent: '#8b5cf6', accentForeground: '#f8fafc' },
    purple: { accent: '#a855f7', accentForeground: '#f8fafc' },
    fuchsia: { accent: '#d946ef', accentForeground: '#0f172a' },
    pink: { accent: '#ec4899', accentForeground: '#0f172a' },
    rose: { accent: '#f43f5e', accentForeground: '#0f172a' },
};

const RADIUS_TOKENS: Record<Radius, string> = {
    none: '0rem',
    small: '0.125rem',
    medium: '0.25rem',
    large: '0.5rem',
};

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
    organizations?: {
        name: string;
    }[];
};

type UserQueryResult = UseQueryResult<User | null, Error>;

const UserContext = createContext<UserQueryResult | undefined>(undefined);

/** Applies user preferences to the document root. */
function applyUserPreferences(user: User) {
    const root = window.document.documentElement;
    const { accent, accentForeground } = ACCENT_TOKENS[user.accent ?? 'amber'];

    root.style.setProperty('--accent', accent);
    root.style.setProperty('--primary', accent);
    root.style.setProperty('--accent-foreground', accentForeground);
    root.style.setProperty('--primary-foreground', accentForeground);
    root.style.setProperty('--radius', RADIUS_TOKENS[user.radius ?? 'medium']);
    root.lang = user.language ?? 'en';
}

/** Resets document preferences back to the shared defaults. */
function resetUserPreferences() {
    const root = window.document.documentElement;

    root.style.removeProperty('--accent');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--accent-foreground');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--radius');
    root.lang = 'en';
}

/** Hook that fetches the current user. */
function useUserQuery() {
    return useQuery<User | null, Error>({
        queryKey: ['api', '/auth/me'],
        queryFn: async () => {
            const response = await fetch('/auth/me', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
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

    return useMutation({
        mutationFn: async (payload: UserUpdate) => {
            const response = await fetch('/auth/me', {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            return (await response.json()) as User;
        },
        onSuccess: (user) => {
            queryClient.setQueryData(['api', '/auth/me'], user);
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

    return useMutation({
        mutationFn: () => fetch('/auth/logout', { credentials: 'same-origin' }),
        /**
         * Clears the cached user after a successful sign-out.
         */
        onSuccess: () => {
            queryClient.setQueryData(['api', '/auth/me'], null);
            queryClient.invalidateQueries({ queryKey: ['api', '/auth/me'] });
        },
    });
}
