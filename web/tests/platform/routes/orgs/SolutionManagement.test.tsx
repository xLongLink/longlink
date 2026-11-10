// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import * as icons from '@/lib/icons';
import { act, Suspense } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { renderPlatform, membership } from '../../render';
import { IconRequestContext } from '@/components/ui/contexts';
import Management from '@/platform/routes/orgs/SolutionManagement';
import type { OrganizationContext } from '@/platform/layouts/Organization';

const solution = {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Purchase approvals',
    status: 'running',
    deployment_pending: false,
    desired_revision_id: '00000000-0000-4000-8000-000000000004',
    deployed_version: '1.2.0',
};

/** Loads a populated settings table through the real query and response schema. */
async function withSolutions(role: OrganizationContext['role'], check: (output: HTMLElement) => Promise<void>) {
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (request.method === 'GET' && path === `/api/v1/organizations/${membership.organization.id}/solutions`) {
            return Response.json([solution]);
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withMounted(
            <IconRequestContext value={icons.load}>
                <Suspense fallback={<p>Loading solutions</p>}>
                    <Management
                        membership={{ ...membership, role, tags: [], activeTag: undefined }}
                        presentation="settings"
                    />
                </Suspense>
            </IconRequestContext>,
            async (output) => {
                await vi.waitFor(() => expect(output.querySelector('tbody tr')?.textContent).toContain(solution.name));
                await check(output);
            }
        );
    } finally {
        transport.mockRestore();
    }
}

it('does not offer creation to readers of Organization settings', () => {
    // Act
    const output = renderPlatform(
        <Management
            membership={{ ...membership, role: 'read', tags: [], activeTag: undefined }}
            presentation="settings"
        />,
        '/',
        [[`/api/v1/organizations/${membership.organization.id}/solutions`, []]]
    );

    // Assert
    expect(output.querySelector('h2')?.textContent).toBe('Solutions');
    expect(output.textContent).not.toContain('New Solution');
});

it('shows existing solutions without creation or row actions to readers', async () => {
    // Act
    await withSolutions('read', async (output) => {
        const row = output.querySelector('tbody tr');

        if (!row) throw new Error('Expected the existing solution row');

        // Assert
        expect(row.querySelector('a')?.getAttribute('href')).toBe(
            `/orgs/${membership.organization.id}/solutions/${solution.id}`
        );
        expect(row.textContent).toContain('1.2.0');
        expect(row.querySelector('button[aria-haspopup="menu"]')).toBeNull();
        expect(output.textContent).not.toContain('New Solution');
        expect(output.textContent).not.toContain('Permissions');
    });
});

it.each([
    { role: 'maintain', actions: ['Tags', 'Update', 'Logs', 'MCP', 'Delete'] },
    { role: 'admin', actions: ['Permissions', 'Tags', 'Update', 'Logs', 'MCP', 'Delete'] },
] as const)('offers authorized solution actions to $role callers', async ({ role, actions }) => {
    // Arrange
    await withSolutions(role, async (output) => {
        const row = output.querySelector('tbody tr');
        const trigger = row?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');

        if (!trigger) throw new Error('Expected actions for the existing solution');

        // Act
        await act(async () => trigger.click());

        const menu = document.getElementById(trigger.getAttribute('aria-controls') ?? '');

        if (!menu) throw new Error('Expected the open solution menu');

        // Assert
        expect(output.textContent).toContain('New Solution');
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(Array.from(menu.querySelectorAll('[role="menuitem"]'), (item) => item.textContent?.trim())).toEqual(
            actions
        );
    });
});
