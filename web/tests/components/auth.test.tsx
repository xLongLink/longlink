import { describe, expect, it, mock } from 'bun:test';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
    useUser: () => ({
        isLoading: false,
        role: 'administrator',
        user: { id: '1' },
    }),
}));

mock.module('react-router', () => ({
    useLocation: () => ({ pathname: '/orgs/test', search: '', hash: '' }),
}));

const { Auth } = await import('@/components/Auth');

describe('Auth', () => {
    it('allows administrators to access user routes', () => {
        const output = renderToStaticMarkup(
            createElement(Auth, { requiredRole: 'user', children: createElement('div', null, 'ok') })
        );

        expect(output).toContain('ok');
        expect(output).not.toContain('not found');
    });
});
