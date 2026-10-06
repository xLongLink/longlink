import { requestUrl } from '@/views/host';
import { describe, expect, it } from 'vitest';

describe('Solution request URLs', () => {
    it('resolves bridge requests only inside the selected Solution proxy', () => {
        expect(requestUrl('/api/v1/solutions/selected/proxy/', '/api/items?page=1')).toBe(
            '/api/v1/solutions/selected/proxy/api/items?page=1'
        );
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', '/../users')).toThrow();
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', '/%252e%252e/users')).toThrow();
    });

    it('rejects external destinations rather than granting browser navigation capabilities', () => {
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', 'https://example.com/next')).toThrow();
        expect(() => requestUrl('/api/v1/solutions/selected/proxy/', '//example.com/next')).toThrow();
    });
});
