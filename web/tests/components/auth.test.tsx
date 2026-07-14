import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { HydrationBoundary, QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import type { PlatformRole } from '@/lib/roles';
import { Auth } from '@/components/Auth';
import { ApiI18nProvider } from '@/lib/i18n';
import { UserProvider, type User } from '@/hooks/use-user';
import { accountsQueryKey, userOrganizationsQueryKey, userProfileQueryKey } from '@/lib/query-keys';

const administrator: User = {
    id: '1',
    name: 'Admin',
    oidc: 'admin-oidc',
    role: 'administrator',
    email: 'admin@example.com',
    theme: 'dark',
    accent: 'neutral',
    avatar: '',
    radius: 'medium',
    language: 'en',
};

/** Renders Auth with isolated, hydrated production providers. */
function renderAuth(user: User | null, path: string, requiredRole?: PlatformRole): string {
    const sourceClient = new QueryClient();
    const queryClient = new QueryClient();

    // Seed every user query consumed by Auth and its anonymous sign-in shell.
    sourceClient.setQueryData(userProfileQueryKey(), user);
    sourceClient.setQueryData(userOrganizationsQueryKey(), []);
    sourceClient.setQueryData(accountsQueryKey(), []);

    try {
        return renderToStaticMarkup(
            <QueryClientProvider client={queryClient}>
                <HydrationBoundary state={dehydrate(sourceClient)}>
                    <UserProvider>
                        <ApiI18nProvider language="en">
                            <MemoryRouter initialEntries={[path]}>
                                <Auth requiredRole={requiredRole}>
                                    <div>ok</div>
                                </Auth>
                            </MemoryRouter>
                        </ApiI18nProvider>
                    </UserProvider>
                </HydrationBoundary>
            </QueryClientProvider>
        );
    } finally {
        sourceClient.clear();
        queryClient.clear();
    }
}

describe('Auth', () => {
    it('shows sign-in for anonymous users', () => {
        const output = renderAuth(null, '/settings?tab=profile#top');

        expect(output).toContain('Welcome to');
        expect(output).toContain('Sign In');
        expect(output).not.toContain('>ok<');
    });

    it('allows administrators to access user routes', () => {
        const output = renderAuth(administrator, '/orgs/test', 'user');

        expect(output).toBe('<div>ok</div>');
    });

    it('renders not found for users below the required platform role', () => {
        const output = renderAuth(
            {
                ...administrator,
                id: '2',
                name: 'User',
                oidc: 'user-oidc',
                role: 'user',
                email: 'user@example.com',
            },
            '/admin',
            'support'
        );

        expect(output).toContain('We can&#x27;t find that page');
        expect(output).not.toContain('>ok<');
    });
});
