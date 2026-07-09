import { resolveOrganizationId } from '@/hooks/use-organization';
import type { ApiUserOrganizationMembership } from '@/lib/types';
import { describe, expect, it } from 'bun:test';

describe('resolveOrganizationId', () => {
    it('resolves organization slugs to canonical ids', () => {
        const organizations: ApiUserOrganizationMembership[] = [
            {
                id: 'organization-1',
                name: 'Acme',
                slug: 'acme',
                avatar: '',
                country: 'CH',
                location: {
                    id: 'location-1',
                    name: 'Local',
                    slug: 'local',
                    country: 'CH',
                },
                role: 'owner',
            },
        ];

        expect(resolveOrganizationId('acme', organizations)).toBe('organization-1');
        expect(resolveOrganizationId('missing', organizations)).toBe('');
    });
});
