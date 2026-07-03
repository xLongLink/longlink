import { findPageRouteMatch, findPageTabMatch, pageRoutePattern } from '@/pages/View';
import { describe, expect, it } from 'bun:test';

describe('View route metadata', () => {
    it('matches exact routes before dynamic routes', () => {
        const pages = [
            { path: 'pages/issues/[issue].xml', route: 'issues/:issue', tab: 'issues' },
            { path: 'pages/issues/new.xml', route: 'issues/new', tab: 'issues' },
        ];

        const match = findPageRouteMatch(pages, 'issues/new');

        expect(match?.page.path).toBe('pages/issues/new.xml');
        expect(match?.params).toEqual({});
    });

    it('extracts dynamic route params', () => {
        const pages = [{ path: 'pages/issues/[issue].xml', route: 'issues/:issue', tab: 'issues' }];

        const match = findPageRouteMatch(pages, 'issues/123');

        expect(match?.page.path).toBe('pages/issues/[issue].xml');
        expect(match?.params).toEqual({ issue: '123' });
    });

    it('falls back to tab routes for older metadata', () => {
        const pages = [{ path: 'pages/dashboard.xml', tab: 'dashboard' }];

        expect(pageRoutePattern(pages[0])).toBe('dashboard');
        expect(findPageRouteMatch(pages, 'dashboard')?.page.path).toBe('pages/dashboard.xml');
    });

    it('prefers static pages for tab fallbacks', () => {
        const pages = [
            { path: 'pages/requests/[request].xml', route: 'requests/:request', tab: 'requests' },
            { path: 'pages/requests.xml', route: 'requests', tab: 'requests' },
        ];

        expect(findPageTabMatch(pages, 'requests')?.path).toBe('pages/requests.xml');
    });
});
