// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderPlatform, membership } from '../../render';
import Management from '@/platform/routes/orgs/SolutionManagement';

it('does not offer creation to readers of Organization settings', () => {
    // Act
    const output = renderPlatform(
        <Management
            organization={membership.organization}
            tags={[]}
            activeTag={undefined}
            canMaintain={false}
            presentation="settings"
        />,
        '/',
        [[`/api/v1/organizations/${membership.organization.id}/solutions`, []]]
    );

    // Assert
    expect(output.querySelector('h2')?.textContent).toBe('Solutions');
    expect(output.textContent).not.toContain('New Solution');
});
