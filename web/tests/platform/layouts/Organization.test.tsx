// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import Layout from '@/platform/layouts/Organization';
import { renderPlatform, membership } from '../render';

it('scopes organization navigation to the selected UUID', () => {
    // Act
    const output = renderPlatform(
        <Layout />,
        `/orgs/${membership.organization.id}`,
        [
            [
                `/api/v1/organizations/${membership.organization.id}/tags`,
                [{ id: '00000000-0000-4000-8000-000000000003', name: 'All', kind: 'all', icon: 'app-window' }],
            ],
        ],
        '/orgs/:organization'
    );

    // Assert
    expect(output.querySelector(`a[href="/orgs/${membership.organization.id}"]`)).not.toBeNull();
    expect(output.querySelector(`a[href="/orgs/${membership.organization.id}/settings"]`)).not.toBeNull();
});
