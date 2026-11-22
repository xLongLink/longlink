import { describe, expect, it } from 'vitest';
import {
    requestUrl,
    resolveExternalUrl,
    resolveNavigationUrl,
    resolveScopedNavigationUrl,
    resolveRequestUrl
} from '@/lib/url';

describe('resolveExternalUrl', () => {
    it.each([
        ['https://platform.example', ' https://docs.example/help ', 'https://docs.example/help'],
        ['https://platform.example', 'http://docs.example/help', 'http://docs.example/help'],
        ['http://platform.example', '//docs.example/help', 'http://docs.example/help']
    ])('resolves external navigation %s + %s', (base, path, expected) => {
        // Act and assert
        expect(resolveExternalUrl(base, path)).toBe(expected);
    });

    it.each([
        '/orders',
        'javascript:alert(1)',
        'data:text/html,unsafe',
        'https://user@example.com/private',
        'https://:password@example.com/private',
        '//['
    ])('withholds unsupported external destination %s', (path) => {
        // Act and assert
        expect(resolveExternalUrl('https://platform.example', path)).toBeUndefined();
    });
});

describe('resolveNavigationUrl', () => {
    it('omits empty destinations', () => {
        expect(resolveNavigationUrl('/', '')).toBe('');
        expect(resolveNavigationUrl('/solutions/123', '   ')).toBe('');
    });

    it.each([
        ['/api', '/items', '/api/items'],
        ['/api/', 'items', '/api/items'],
        [
            'https://solutions.example/api/solutions/123/proxy/',
            '/items',
            'https://solutions.example/api/solutions/123/proxy/items'
        ]
    ])('joins base %s and relative path %s', (baseUrl, path, expected) => {
        // Act and assert
        expect(resolveNavigationUrl(baseUrl, path)).toBe(expected);
    });

    it('resolves dot segments', () => {
        expect(resolveNavigationUrl('/api', '../items')).toBe('/api/items');
        expect(resolveNavigationUrl('/api/solutions/123/proxy/', '../../me')).toBe('/api/solutions/123/proxy/me');
    });

    it.each(['javascript:alert(1)', 'https://evil.example/items', '//evil.example/items', '\\evil.example/items'])(
        'drops unsafe navigation destinations: %s',
        (path) => {
            expect(resolveNavigationUrl('/api', path)).toBe('');
        }
    );
});

describe('resolveRequestUrl', () => {
    it('resolves solution-relative request paths', () => {
        expect(resolveRequestUrl('/api/solutions/123/proxy', '/items')).toBe('/api/solutions/123/proxy/items');
        expect(resolveRequestUrl('/api/solutions/123/proxy', './items')).toBe('/api/solutions/123/proxy/items');
        expect(resolveRequestUrl('https://solutions.example/api/solutions/123/proxy', '/items')).toBe(
            'https://solutions.example/api/solutions/123/proxy/items'
        );
    });

    it.each([
        'https://evil.example/items',
        '//evil.example/items',
        '///evil.example/items',
        '\\evil.example/items',
        'javascript:alert(1)',
        'data:text/html,payload'
    ])('rejects request URL evasion paths: %s', (path) => {
        expect(() => resolveRequestUrl('/api/solutions/123/proxy', path)).toThrow(
            'Solution request URL must be solution-relative'
        );
    });

    it.each(['../me', '/%2e%2e/api/v1/me', '/.%2e/api/v1/me', '/%2e./api/v1/me', '/items%2f..%2fapi/v1/me'])(
        'rejects a path that could escape the solution proxy: %s',
        (path) => {
            expect(() => resolveRequestUrl('/api/solutions/123/proxy', path)).toThrow(
                'Solution request URL must remain within the solution'
            );
        }
    );
});

describe('requestUrl', () => {
    it('preserves encoded query values within the selected solution proxy', () => {
        expect(requestUrl('/api/v1/solutions/selected/proxy/', '/api/items?filter=%2Factive')).toBe(
            '/api/v1/solutions/selected/proxy/api/items?filter=%2Factive'
        );
    });

    it('rejects an ambiguously encoded path before URL resolution', () => {
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', '/%252e%252e/users')).toThrow(
            'Request path must remain within the Solution'
        );
    });
});

describe('resolveScopedNavigationUrl', () => {
    it.each([
        ['invoices//recent/', '/solutions/orders/invoices/recent'],
        ['invoices/../recent', '/solutions/orders/recent'],
        ['../orders/recent', '/solutions/orders/orders/recent'],
        ['?filter=%2Factive', '/solutions/orders?filter=%2Factive'],
        ['#details', '/solutions/orders#details']
    ])('preserves admitted route canonicalization for %s', (path, expected) => {
        // Act and assert
        expect(resolveScopedNavigationUrl('/solutions/orders', path)).toBe(expected);
    });

    it.each([
        '../users',
        '/%252e%252e/users',
        '/items%2f..%2fusers',
        '/items%5cusers',
        '/items%0ausers',
        '/items with spaces'
    ])('withholds unsafe scoped route %s', (path) => {
        // Act and assert
        expect(resolveScopedNavigationUrl('/solutions/orders', path)).toBe('');
    });
});
