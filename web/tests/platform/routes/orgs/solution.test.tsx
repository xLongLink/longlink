// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import Page from '@/platform/routes/orgs/solution';
import { renderPlatform, membership } from '../../render';
import { zOrganizationSolutionSummary } from '@/lib/generated/platform-api-v1/zod.gen';

it('does not mount the runtime while a resolved Solution is still deploying', () => {
    // Arrange
    const solution = zOrganizationSolutionSummary.parse({
        id: '00000000-0000-4000-8000-000000000003',
        name: 'Orders',
        status: 'creating',
        deployment_pending: true,
        desired_revision_id: null,
        deployed_version: null
    });

    // Act
    const output = renderPlatform(
        <Page />,
        `/orgs/${membership.organization.id}/solutions/${solution.id}`,
        [[`/api/v1/organizations/${membership.organization.id}/solutions`, [solution]]],
        '/orgs/:organization/solutions/:solution'
    );

    // Assert
    expect(output.querySelector('[role="alert"] h1')?.textContent).toBe('Solution is being deployed');
    expect(output.querySelector('[role="alert"]')?.textContent).toContain('Please try again in a moment.');
    expect(output.querySelector('iframe')).toBeNull();
});

it.each(['read', 'maintain'] as const)('limits failed-deployment logs for the %s role', (role) => {
    const solution = zOrganizationSolutionSummary.parse({
        id: '00000000-0000-4000-8000-000000000003',
        name: 'Orders',
        status: 'failed',
        deployment_pending: false,
        desired_revision_id: null,
        deployed_version: null
    });

    // Cached logs must remain undisclosed to members without maintenance access.
    const output = renderPlatform(
        <Page />,
        `/orgs/${membership.organization.id}/solutions/${solution.id}`,
        [
            [`/api/v1/organizations/${membership.organization.id}/solutions`, [solution]],
            [`/api/v1/solutions/${solution.id}/logs`, ['Private deployment diagnostics']]
        ],
        '/orgs/:organization/solutions/:solution',
        { ...membership, role }
    );

    expect(output.textContent?.includes('Private deployment diagnostics')).toBe(role === 'maintain');
    expect(output.querySelector('iframe')).toBeNull();

    if (role === 'read') {
        expect(output.querySelector('[role="alert"] h1')?.textContent).toBe('Solution deployment failed');
        expect(output.querySelector('[role="alert"]')?.textContent).toContain(
            'Review the failed operation in the Platform administration area.'
        );
    }
});
