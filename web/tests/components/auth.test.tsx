import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

type MockedUserState = {
    isLoading: boolean;
    role: 'user' | 'support' | 'administrator';
    signOut: () => Promise<void>;
    switchAccount: () => Promise<void>;
    user: { avatar: string; email: string; id: string; name: string; role: string } | null;
};

let mockedUserState: MockedUserState;

mock.module('@/components/SignInCard', () => ({
    SignInCard: ({ redirectTo }: { redirectTo: string }) => createElement('div', null, `sign in ${redirectTo}`),
}));

mock.module('@/layout/Layout', () => ({
    default: ({ children }: { children: ReactNode }) => children,
}));

mock.module('@/hooks/use-user', () => ({
    UserProvider: ({ children }: { children: ReactNode }) => children,
    useUser: () => mockedUserState,
}));

const { Auth } = await import('@/components/Auth');

describe('Auth', () => {
    beforeEach(() => {
        mockedUserState = {
            isLoading: false,
            role: 'administrator',
            signOut: async () => {},
            switchAccount: async () => {},
            user: { avatar: '', email: 'admin@example.com', id: '1', name: 'Admin', role: 'administrator' },
        };
    });

    it('shows sign-in for anonymous users', () => {
        mockedUserState = {
            ...mockedUserState,
            role: 'user',
            user: null,
        };

        const output = renderToStaticMarkup(
            createElement(
                MemoryRouter,
                { initialEntries: ['/settings?tab=profile#top'] },
                createElement(Auth, { children: createElement('div', null, 'ok') })
            )
        );

        expect(output).toContain('sign in /settings?tab=profile#top');
    });

    it('allows administrators to access user routes', () => {
        const output = renderToStaticMarkup(
            createElement(
                MemoryRouter,
                { initialEntries: ['/orgs/test'] },
                createElement(Auth, { requiredRole: 'user', children: createElement('div', null, 'ok') })
            )
        );

        expect(output).toContain('ok');
        expect(output).not.toContain('not found');
    });

    it('renders not found for users below the required platform role', () => {
        mockedUserState = {
            ...mockedUserState,
            role: 'user',
            user: { avatar: '', email: 'user@example.com', id: '2', name: 'User', role: 'user' },
        };

        const output = renderToStaticMarkup(
            createElement(
                MemoryRouter,
                { initialEntries: ['/admin'] },
                createElement(Auth, { requiredRole: 'support', children: createElement('div', null, 'ok') })
            )
        );

        expect(output).toContain('We can&#x27;t find that page');
        expect(output).not.toContain('>ok<');
    });
});
