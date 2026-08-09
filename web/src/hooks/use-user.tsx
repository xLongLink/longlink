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

const UserContext = createContext<UseQueryResult<UserProfile | null, Error> | undefined>(undefined);

/** Caches non-sensitive theme preferences for the next page's first paint. */
function storeThemePreferences({ theme, accent, radius }: Pick<UserProfile, 'theme' | 'accent' | 'radius'>): void {
    localStorage.setItem(THEME_PREFERENCES_KEY, JSON.stringify({ theme, accent, radius }));
}

/** Provides the authenticated user query to the app tree. */
export function UserProvider({ children }: { children: React.ReactNode }) {
    const user = useApiQuery<UserProfile | null>(platformApiPath('/me'), {
        // Auth state must refresh immediately after login/logout redirects.
        parse: (value) => (value === null ? null : zUserProfile.parse(value)),
        staleTime: 0,
        refetchOnWindowFocus: true,
        retry: false,
    });

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
export function useUserProfile() {
    // Fail fast when the provider is missing.
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUserProfile must be used within a UserProvider');
    }

    const { data: user, error, isLoading } = context;

    return {
        user: user ?? null,
        role: user?.role ?? 'user',
        theme: user?.theme ?? ('dark' as Theme),
        accent: user?.accent ?? ('neutral' as Accent),
        radius: user?.radius ?? DEFAULT_RADIUS,
        isLoading,
        error: error ?? null,
    };
}

/** Reads organization memberships only when a user is authenticated. */
export function useUserOrganizations() {
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

/** Provides an action that ends the current user session. */
export function useSignOut() {
    const queryClient = useQueryClient();

    /** Signs the current user out and clears cached session state. */
    const signOut = async () => {
        await fetchApiVoid(platformApiPath('/auth/logout'), { method: 'POST' });
        queryClient.clear();
        localStorage.removeItem(THEME_PREFERENCES_KEY);
        window.location.assign('/organizations');
    };

    return signOut;
}

/** Updates the current user profile. */
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: Partial<Pick<UserProfile, 'name' | 'avatar' | 'theme' | 'accent' | 'radius'>>) =>
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
