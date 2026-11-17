// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { it, expect, vi } from 'vitest';
import { membership } from '../../render';
import { withMounted } from '../../../render';
import { ApiProvider } from '@/components/api';
import { act, Suspense, useState } from 'react';
import userEvent from '@testing-library/user-event';
import Management from '@/platform/routes/orgs/solution-management';
import { SolutionLogsDialog } from '@/components/dialogs/solution-logs';
import type { OrganizationContext } from '@/platform/layouts/organization';

const solution = {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Purchase approvals',
    status: 'running',
    deployment_pending: false,
    desired_revision_id: '00000000-0000-4000-8000-000000000004',
    deployed_version: '1.2.0'
};

const mcpResource = `https://solutions.example/api/v1/solutions/${solution.id}/proxy/mcp`;

it('joins repeated log refreshes, retains logs after failure, and recovers before reopening', async () => {
    const events = userEvent.setup();
    let requests = 0;
    let finishRefresh: ((response: Response) => void) | undefined;
    const refresh = new Promise<Response>((resolve) => {
        finishRefresh = resolve;
    });
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (request.method !== 'GET' || new URL(request.url).pathname !== `/api/v1/solutions/${solution.id}/logs`) {
            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        }

        requests++;
        if (requests === 1) return Response.json(['Deployment started']);
        if (requests === 2) return refresh;
        return Response.json(['Deployment recovered']);
    });

    /** Mounts each logs attempt using the same visibility ownership as Solution management. */
    function Logs() {
        const [open, setOpen] = useState(true);

        return open ? (
            <SolutionLogsDialog solutionId={solution.id} onOpenChange={setOpen} />
        ) : (
            <button onClick={() => setOpen(true)}>Open logs</button>
        );
    }

    try {
        await withMounted(
            <ApiProvider>
                <Logs />
            </ApiProvider>,
            async () => {
                await vi.waitFor(() =>
                    expect(document.querySelector('[aria-label="Deployment logs"]')?.textContent).toContain(
                        'Deployment started'
                    )
                );
                const button = Array.from(document.querySelectorAll('button')).find(
                    (element) => element.textContent === 'Refresh logs'
                );

                if (!button) throw new Error('Missing logs refresh');

                // Activate twice before React publishes pending feedback.
                await act(async () => {
                    button.click();
                    button.click();
                });
                expect(requests).toBe(2);
                expect(button.disabled).toBe(true);
                expect(button.getAttribute('aria-busy')).toBe('true');

                await act(async () => finishRefresh?.(Response.json({ detail: 'Logs unavailable' }, { status: 503 })));
                await vi.waitFor(() => {
                    expect(button.disabled).toBe(false);
                    expect(document.querySelector('[data-sonner-toast]')?.textContent).toContain('Logs unavailable');
                });
                expect(document.querySelector('[aria-label="Deployment logs"]')?.textContent).toContain(
                    'Deployment started'
                );
                expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);

                await act(async () => events.click(button));
                await vi.waitFor(() =>
                    expect(document.querySelector('[aria-label="Deployment logs"]')?.textContent).toContain(
                        'Deployment recovered'
                    )
                );
                expect(requests).toBe(3);

                const close = Array.from(document.querySelectorAll('button')).find(
                    (element) => element.textContent === 'Close'
                );

                if (!close) throw new Error('Missing logs close');
                await act(async () => events.click(close));
                await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
                const reopen = Array.from(document.querySelectorAll('button')).find(
                    (element) => element.textContent === 'Open logs'
                );

                if (!reopen) throw new Error('Missing logs opener');
                await act(async () => events.click(reopen));
                await vi.waitFor(() =>
                    expect(document.querySelector('[aria-label="Deployment logs"]')?.textContent).toContain(
                        'Deployment recovered'
                    )
                );
            }
        );
    } finally {
        finishRefresh?.(Response.json([]));
        transport.mockRestore();
    }
});

/** Loads a populated settings table through the real query and response schema. */
async function withSolutions(role: OrganizationContext['role'], check: (output: HTMLElement) => Promise<void>) {
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (request.method === 'GET' && path === `/api/v1/organizations/${membership.organization.id}/solutions`) {
            return Response.json([solution]);
        }

        if (
            request.method === 'GET' &&
            path === `/.well-known/oauth-protected-resource/api/v1/solutions/${solution.id}/proxy/mcp`
        ) {
            return Response.json({
                resource: mcpResource,
                scopes_supported: [],
                authorization_servers: ['https://platform.example']
            });
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withMounted(
            <ApiProvider>
                <Suspense fallback={<p>Loading solutions</p>}>
                    <Management
                        membership={{ ...membership, role, tags: [], activeTag: undefined }}
                        presentation="settings"
                    />
                </Suspense>
            </ApiProvider>,
            async (output) => {
                await vi.waitFor(() => expect(output.querySelector('tbody tr')?.textContent).toContain(solution.name));
                await check(output);
            }
        );
    } finally {
        transport.mockRestore();
    }
}

it('shows existing solutions without creation or row actions to readers', async () => {
    // Act
    await withSolutions('read', async (output) => {
        const row = output.querySelector('tbody tr');

        if (!row) throw new Error('Expected the existing solution row');

        // Assert
        expect(output.querySelector('h2')?.textContent).toBe('Solutions');
        expect(row.querySelector('a')?.getAttribute('href')).toBe(
            `/orgs/${membership.organization.id}/solutions/${solution.id}`
        );
        expect(row.textContent).toContain('1.2.0');
        expect(row.querySelector('button[aria-haspopup="menu"]')).toBeNull();
        expect(output.textContent).not.toContain('New Solution');
        expect(output.textContent).not.toContain('Permissions');
    });
});

it('confirms the canonical MCP URL copy only after the clipboard succeeds and closes its dialog', async () => {
    const events = userEvent.setup();
    let finishCopy: (() => void) | undefined;

    const copied = new Promise<void>((resolve) => {
        finishCopy = resolve;
    });

    const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockReturnValue(copied);

    try {
        await withSolutions('maintain', async (output) => {
            const trigger = output.querySelector<HTMLButtonElement>('tbody tr button[aria-haspopup="menu"]');

            if (!trigger) throw new Error('Missing Solution actions');
            await act(async () => events.click(trigger));

            const mcp = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
                (item) => item.textContent?.trim() === 'MCP'
            );

            if (!mcp) throw new Error('Missing MCP action');
            await act(async () => events.click(mcp));
            await vi.waitFor(() =>
                expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Copy MCP server URL')
            );

            const copy = Array.from(document.querySelectorAll('button')).find(
                (button) => button.textContent === 'Copy MCP server URL'
            );

            if (!copy) throw new Error('Missing MCP copy action');
            await act(async () => events.click(copy));
            expect(clipboard).toHaveBeenCalledExactlyOnceWith(mcpResource);
            expect(document.querySelector('[data-sonner-toast]')).toBeNull();
            expect(document.querySelector('[role="dialog"]')).not.toBeNull();

            await act(async () => finishCopy?.());
            await vi.waitFor(() => {
                expect(document.querySelector('[data-sonner-toast]')?.textContent).toContain('Copied');
                expect(document.querySelector('[role="dialog"]')).toBeNull();
            });
            expect(document.querySelectorAll('[data-sonner-toaster]')).toHaveLength(1);
        });
    } finally {
        finishCopy?.();
        clipboard.mockRestore();
    }
});

it.each([
    { role: 'maintain', actions: ['Tags', 'Update', 'Logs', 'MCP', 'Delete'] },
    { role: 'admin', actions: ['Permissions', 'Tags', 'Update', 'Logs', 'MCP', 'Delete'] }
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
