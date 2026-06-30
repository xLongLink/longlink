import { describe, expect, it, mock } from 'bun:test';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

mock.module('@/components/SignInCard', () => ({
    SignInCard: () => createElement('div', null, 'sign in'),
}));

mock.module('@/layout/Layout', () => ({
    default: ({ children }: { children: ReactNode }) => children,
}));

mock.module('@/pages/NotFound', () => ({
    default: () => createElement('div', null, 'not found'),
}));

mock.module('@/hooks/use-user', () => ({
    UserProvider: ({ children }: { children: ReactNode }) => children,
    useUser: () => ({
        isLoading: false,
        role: 'administrator',
        signOut: async () => {},
        switchAccount: async () => {},
        user: { avatar: '', email: 'admin@example.com', id: '1', name: 'Admin', role: 'administrator' },
    }),
}));

const { Auth } = await import('@/components/Auth');

describe('Auth', () => {
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
});
