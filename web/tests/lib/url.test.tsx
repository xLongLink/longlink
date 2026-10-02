import { describe, expect, it } from 'vitest';
import { resolveNavigationUrl, resolveRequestUrl } from '@/lib/url';

describe('resolveNavigationUrl', () => {
    it('omits empty destinations', () => {
        expect(resolveNavigationUrl('/', '')).toBe('');
        expect(resolveNavigationUrl('/solutions/123', '   ')).toBe('');
    });

    it('joins base and relative paths', () => {
        expect(resolveNavigationUrl('/api', '/items')).toBe('/api/items');
        expect(resolveNavigationUrl('/api/', 'items')).toBe('/api/items');
        expect(resolveNavigationUrl('https://solutions.example/api/solutions/123/proxy/', '/items')).toBe(
            'https://solutions.example/api/solutions/123/proxy/items'
        );
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
        'http://evil.example/items',
        '//evil.example/items',
        '///evil.example/items',
        '\\evil.example/items',
        'javascript:alert(1)',
        'data:text/html,payload',
    ])('rejects request URL evasion paths: %s', (path) => {
        expect(() => resolveRequestUrl('/api/solutions/123/proxy', path)).toThrow(
            'XML request URL must be solution-relative'
        );
    });

    it.each([
        '../me',
        '../../api/v1/me',
        '/%2e%2e/api/v1/me',
        '/.%2e/api/v1/me',
        '/%2e./api/v1/me',
        '/items%2f..%2fapi/v1/me',
    ])('rejects encoded path that could escape the solution proxy: %s', (path) => {
        expect(() => resolveRequestUrl('/api/solutions/123/proxy', path)).toThrow(
            'XML request URL must remain within the solution'
        );
    });

    it('preserves encoded query values within the solution proxy', () => {
        expect(resolveRequestUrl('/api/solutions/123/proxy', '/items?filter=%2Factive')).toBe(
            '/api/solutions/123/proxy/items?filter=%2Factive'
        );
    });
});
