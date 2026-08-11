import { describe, expect, it } from 'vitest';
import { isAppRelativeUrl, resolveAnchorUrl, resolveRequestUrl, resolveUrl } from '@/xml/v1/core/url';

describe('resolveUrl', () => {
    it('joins base and relative paths', () => {
        expect(resolveUrl('/api', '/items')).toBe('/api/items');
        expect(resolveUrl('/api/', 'items')).toBe('/api/items');
        expect(resolveUrl('https://apps.example/api/applications/123/proxy/', '/items')).toBe(
            'https://apps.example/api/applications/123/proxy/items'
        );
    });

    it('returns an absolute url unchanged', () => {
        expect(resolveUrl('/api', 'https://example.com')).toBe('https://example.com');
    });

    it('resolves dot segments', () => {
        expect(resolveUrl('/api', '../items')).toBe('/api/items');
        expect(resolveUrl('/api/applications/123/proxy/', '../../me')).toBe('/api/applications/123/proxy/me');
    });
});

describe('resolveRequestUrl', () => {
    it('resolves app-relative request paths', () => {
        expect(resolveRequestUrl('/api/applications/123/proxy', '/items')).toBe('/api/applications/123/proxy/items');
        expect(resolveRequestUrl('/api/applications/123/proxy', './items')).toBe('/api/applications/123/proxy/items');
        expect(resolveRequestUrl('https://apps.example/api/applications/123/proxy', '/items')).toBe(
            'https://apps.example/api/applications/123/proxy/items'
        );
    });

    it('rejects external request URLs', () => {
        expect(isAppRelativeUrl('/items')).toBe(true);
        expect(isAppRelativeUrl('items')).toBe(true);
        expect(isAppRelativeUrl('https://example.com/items')).toBe(false);
        expect(isAppRelativeUrl('//example.com/items')).toBe(false);
        expect(isAppRelativeUrl('/\\example.com/items')).toBe(false);
        expect(() => resolveRequestUrl('/api', 'https://example.com/items')).toThrow(
            'XML request URL must be app-relative'
        );
    });

    it.each([
        'https://evil.example/items',
        'http://evil.example/items',
        '//evil.example/items',
        '///evil.example/items',
        '/\\evil.example/items',
        '\\evil.example/items',
        'javascript:alert(1)',
        'data:text/html,payload',
    ])('rejects request URL evasion paths: %s', (path) => {
        expect(() => resolveRequestUrl('/api/applications/123/proxy', path)).toThrow(
            'XML request URL must be app-relative'
        );
    });

    it('rejects encoded paths that could escape the application proxy', () => {
        const baseUrl = '/api/applications/123/proxy';
        const traversalPaths = ['/%2e%2e/api/v1/me', '/.%2e/api/v1/me', '/%2e./api/v1/me', '/items%2f..%2fapi/v1/me'];

        for (const path of traversalPaths) {
            expect(() => resolveRequestUrl(baseUrl, path)).toThrow(
                'XML request URL must remain within the application'
            );
        }
    });

    it('preserves encoded query values within the application proxy', () => {
        expect(resolveRequestUrl('/api/applications/123/proxy', '/items?filter=%2Factive')).toBe(
            '/api/applications/123/proxy/items?filter=%2Factive'
        );
    });
});

describe('resolveAnchorUrl', () => {
    it('allows intended browser and app-relative anchors', () => {
        expect(resolveAnchorUrl('/orgs/acme/apps/tracker', 'https://docs.example.com/issues/123')).toBe(
            'https://docs.example.com/issues/123'
        );
        expect(resolveAnchorUrl('/orgs/acme/apps/tracker', 'mailto:help@example.com')).toBe('mailto:help@example.com');
        expect(resolveAnchorUrl('/orgs/acme/apps/tracker', '/issues/123')).toBe('/orgs/acme/apps/tracker/issues/123');
    });

    it('drops unsafe browser anchors', () => {
        const unsafeUrls = [
            'javascript:alert(1)',
            'data:text/html,<script>alert(1)</script>',
            '//evil.example.com/issues/123',
            '\\evil.example.com/issues/123',
        ];

        expect(unsafeUrls.map((url) => resolveAnchorUrl('/orgs/acme/apps/tracker', url))).toEqual(['', '', '', '']);
    });
});
