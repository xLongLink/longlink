// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import Page from '@/platform/routes/orgs/Solution';
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
        deployed_version: null,
    });

    // Act
    const output = renderPlatform(
        <Page />,
        `/orgs/${membership.organization.id}/solutions/${solution.id}`,
        [[`/api/v1/organizations/${membership.organization.id}/solutions`, [solution]]],
        '/orgs/:organization/solutions/:solution'
    );

    // Assert
    expect(output.textContent).toContain('Solution is being deployed');
    expect(output.querySelector('iframe')).toBeNull();
});
