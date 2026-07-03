import { resolveOrganizationId } from '@/hooks/use-organization';
import { describe, expect, it } from 'bun:test';

describe('resolveOrganizationId', () => {
    it('resolves organization slugs to canonical ids', () => {
        expect(resolveOrganizationId('acme', [{ id: 'organization-1', slug: 'acme' } as never])).toBe('organization-1');
        expect(resolveOrganizationId('missing', [{ id: 'organization-1', slug: 'acme' } as never])).toBe('');
    });
});
