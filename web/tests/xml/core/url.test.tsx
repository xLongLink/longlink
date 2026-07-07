import { isAppRelativeUrl, resolveRequestUrl, resolveUrl } from '@/xml/core/url';
import { describe, expect, it } from 'bun:test';

describe('resolveUrl', () => {
    it('joins base and relative paths', () => {
        expect(resolveUrl('/api', '/items')).toBe('/api/items');
        expect(resolveUrl('/api/', 'items')).toBe('/api/items');
        expect(resolveUrl('https://apps.example/api/applications/123/proxy/', '/items')).toBe(
            'https://apps.example/api/applications/123/proxy/items'
        );
    });

    it('returns absolute urls unchanged', () => {
        expect(resolveUrl('/api', 'https://example.com')).toBe('https://example.com');
        expect(resolveUrl('/api', 'mailto:help@example.com')).toBe('mailto:help@example.com');
        expect(resolveUrl('/api', '//example.com/assets/app.js')).toBe('//example.com/assets/app.js');
    });

    it('resolves dot segments', () => {
        expect(resolveUrl('/api', '../items')).toBe('/api/items');
        expect(resolveUrl('/api/applications/123/proxy/', '../../me')).toBe('/api/applications/123/proxy/me');
    });
});

describe('resolveRequestUrl', () => {
    it('resolves app-relative request paths', () => {
        expect(resolveRequestUrl('/api/applications/123/proxy', '/items')).toBe('/api/applications/123/proxy/items');
        expect(resolveRequestUrl('/api/applications/123/proxy/', 'items')).toBe('/api/applications/123/proxy/items');
        expect(resolveRequestUrl('https://apps.example/api/applications/123/proxy/', '/items')).toBe(
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
});
