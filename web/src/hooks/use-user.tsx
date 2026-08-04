import { useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';
import { useApiQuery } from '@/hooks/use-api';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { fetchApiJson, fetchApiVoid } from '@/lib/api';
import type { UserOrganizationMembership, UserProfile } from '@/lib/generated/platform-api-v1/types.gen';
import { zUserOrganizationMembership, zUserProfile } from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import { userProfileQueryKey } from '@/lib/query-keys';
import { DEFAULT_RADIUS, THEME_PREFERENCES_KEY, type Accent, type Theme } from '@/lib/theme';

type User = UserProfile;

type UserUpdate = Partial<Pick<User, 'name' | 'avatar' | 'theme' | 'accent' | 'radius'>>;

type UserPreferences = Pick<User, 'theme' | 'accent' | 'radius'>;

type UserQueryResult = UseQueryResult<User | null, Error>;

type UserProfileState = {
    user: User | null;
    role: User['role'];
    theme: User['theme'];
    accent: User['accent'];
    radius: User['radius'];
    isLoading: boolean;
    error: Error | null;
};

type UserOrganizationsState = {
    memberships: UserOrganizationMembership[];
    isLoading: boolean;
    error: Error | null;
};

const UserContext = createContext<UserQueryResult | undefined>(undefined);

const DEFAULT_USER_PREFERENCES = {
    theme: 'dark' as Theme,
    accent: 'neutral' as Accent,
    radius: DEFAULT_RADIUS,
} as const satisfies UserPreferences;

/** Caches non-sensitive theme preferences for the next page's first paint. */
function storeThemePreferences({ theme, accent, radius }: UserPreferences): void {
    localStorage.setItem(THEME_PREFERENCES_KEY, JSON.stringify({ theme, accent, radius }));
}

/** Hook that fetches the current user. */
function useUserQuery() {
    return useApiQuery<User | null>(platformApiPath('/me'), {
        // Auth state must refresh immediately after login/logout redirects.
        parse: (value) => (value === null ? null : zUserProfile.parse(value)),
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

    return {
        user: user ?? null,
        role: user?.role ?? 'user',
        theme: user?.theme ?? DEFAULT_USER_PREFERENCES.theme,
        accent: user?.accent ?? DEFAULT_USER_PREFERENCES.accent,
        radius: user?.radius ?? DEFAULT_USER_PREFERENCES.radius,
        isLoading,
        error: error ?? null,
    };
}

/** Reads organization memberships only when a user is authenticated. */
export function useUserOrganizations(): UserOrganizationsState {
    const profile = useUserProfile();
    const query = useCollectionQuery<UserOrganizationMembership>(
        profile.user ? platformApiPath('/me/organizations') : null,
        {
            parse: (value) => zUserOrganizationMembership.array().parse(value),
        }
    );

    return {
        memberships: query.items,
        isLoading: profile.isLoading || query.isLoading,
        error: profile.error ?? query.error ?? null,
    };
}

/** Provides actions that end the current user session. */
export function useUserSessionActions() {
    const queryClient = useQueryClient();

    /** Signs the current user out and clears cached session state. */
    const signOut = async () => {
        await fetchApiVoid(platformApiPath('/auth/logout'), { method: 'POST' });
        queryClient.clear();
        localStorage.removeItem(THEME_PREFERENCES_KEY);
        window.location.assign('/organizations');
    };

    return {
        signOut,
    };
}

/** Updates the current user profile. */
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UserUpdate) =>
            fetchApiJson(
                platformApiPath('/me'),
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                (value) => zUserProfile.parse(value)
            ),
        onSuccess: (user) => {
            storeThemePreferences(user);
            queryClient.setQueryData(userProfileQueryKey, user);
        },
    });
}
