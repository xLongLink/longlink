import { sanitizeRedirectPath } from '@/lib/redirects';
import { describe, expect, it } from 'bun:test';

describe('sanitizeRedirectPath', () => {
    it('keeps same-origin relative paths', () => {
        expect(sanitizeRedirectPath('/orgs/acme?tab=Apps#top')).toBe('/orgs/acme?tab=Apps#top');
    });

    it('rejects external and malformed redirects', () => {
        expect(sanitizeRedirectPath('//evil.example/path')).toBe('/organizations');
        expect(sanitizeRedirectPath('https://evil.example/path')).toBe('/organizations');
        expect(sanitizeRedirectPath('/\\evil.example/path')).toBe('/organizations');
        expect(sanitizeRedirectPath('settings')).toBe('/organizations');
    });
});
