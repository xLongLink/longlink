// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act, Suspense } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import userEvent from '@testing-library/user-event';
import SolutionPermissions from '@/platform/routes/orgs/dialogs/solution-permissions';

it('retains an explicit no-access draft after save failure and retries against the deployed revision', async () => {
    // Only transport is replaced: queries, selection, disabled save state, and retry stay real.
    const revision = '00000000-0000-4000-8000-000000000001';
    const member = '00000000-0000-4000-8000-000000000002';
    const writes: unknown[] = [];
    const close = vi.fn();
    const reportError = vi.fn();
    let finishFirstWrite: (response: Response) => void = () => {};

    const firstWrite = new Promise<Response>((resolve) => {
        finishFirstWrite = resolve;
    });

    const user = userEvent.setup();
    let savedRole: string | null = 'read';

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (request.method === 'GET' && path === '/api/v1/solutions/orders/permissions') {
            return Response.json({ roles: ['read', 'write'], revision_id: revision });
        }

        if (request.method === 'GET' && path === '/api/v1/organizations/acme/members') {
            return Response.json([
                { user: { id: member, name: 'Alex', email: 'alex@example.com', avatar: '' }, role: 'read' }
            ]);
        }

        if (path === `/api/v1/solutions/orders/members/${member}/access`) {
            if (request.method === 'GET') return Response.json({ role: savedRole, revision_id: revision });

            if (request.method === 'PUT') {
                writes.push(await request.json());

                if (writes.length === 1) return await firstWrite;
                savedRole = null;

                return new Response(null, { status: 204 });
            }
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withMounted(
            <ApiErrorContext value={reportError}>
                <Suspense fallback="Loading permissions">
                    <SolutionPermissions organizationId="acme" solutionId="orders" onClose={close} />
                </Suspense>
            </ApiErrorContext>,
            async (output) => {
                await vi.waitFor(() =>
                    expect(output.querySelector('button[aria-haspopup="listbox"]')?.textContent).toBe('read')
                );
                const trigger = output.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]');

                const save = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Save'
                );

                if (!trigger || !save) throw new Error('Expected permissions controls');

                expect(trigger.getAttribute('aria-label')).toBe('Role for Alex');
                expect(output.querySelector('[aria-label^="Clear"]')).toBeNull();
                expect(save.disabled || save.getAttribute('aria-disabled') === 'true').toBe(true);
                await act(async () => user.click(trigger));

                const noAccess = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
                    (option) => option.textContent === 'No access'
                );

                if (!noAccess) throw new Error('Expected explicit no-access option');

                await act(async () => user.click(noAccess));
                expect(trigger.textContent).toBe('No access');
                expect(writes).toEqual([]);
                await act(async () => user.click(save));
                await vi.waitFor(() => expect(writes).toEqual([{ role: null, revision_id: revision }]));
                expect(trigger.disabled).toBe(true);
                await act(async () => user.click(trigger));
                expect(trigger.getAttribute('aria-expanded')).toBe('false');
                expect(close).not.toHaveBeenCalled();
                await act(async () => finishFirstWrite(Response.json({ detail: 'Try again' }, { status: 409 })));
                await vi.waitFor(() => expect(reportError).toHaveBeenCalledOnce());
                expect(trigger.textContent).toBe('No access');
                await vi.waitFor(() => expect(trigger.disabled).toBe(false));
                expect(close).not.toHaveBeenCalled();
                await act(async () => user.click(save));
                await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
                expect(writes).toEqual([
                    { role: null, revision_id: revision },
                    { role: null, revision_id: revision }
                ]);
            }
        );
    } finally {
        transport.mockRestore();
    }
});

it('retries only the outstanding member draft after a partially successful save', async () => {
    // Arrange
    const revision = '00000000-0000-4000-8000-000000000001';
    const members = [
        { id: '00000000-0000-4000-8000-000000000002', name: 'Alex' },
        { id: '00000000-0000-4000-8000-000000000003', name: 'Blair' },
        { id: '00000000-0000-4000-8000-000000000004', name: 'Casey' }
    ];
    const writes: { memberId: string; body: unknown }[] = [];
    const close = vi.fn();
    const reportError = vi.fn();
    const user = userEvent.setup();
    let failed = false;
    const assignmentReads: string[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;

        if (request.method === 'GET' && path === '/api/v1/solutions/orders/permissions') {
            return Response.json({ roles: ['read', 'write'], revision_id: revision });
        }

        if (request.method === 'GET' && path === '/api/v1/organizations/acme/members') {
            return Response.json(
                members.map(({ id, name }) => ({
                    user: { id, name, email: `${name.toLowerCase()}@example.com`, avatar: '' },
                    role: 'read'
                }))
            );
        }

        const member = members.find(({ id }) => path === `/api/v1/solutions/orders/members/${id}/access`);
        if (!member) throw new Error(`Unexpected request: ${request.method} ${path}`);

        if (request.method === 'GET') {
            assignmentReads.push(member.id);
            if (writes.length > 0) return Response.json({ detail: 'Unavailable' }, { status: 503 });

            return Response.json({ role: 'read', revision_id: revision });
        }

        if (request.method === 'PUT') {
            const body: unknown = await request.json();
            writes.push({ memberId: member.id, body });

            if (member.id === members[1].id && !failed) {
                failed = true;
                return Response.json({ detail: 'Try again' }, { status: 409 });
            }

            return new Response(null, { status: 204 });
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withMounted(
            <ApiErrorContext value={reportError}>
                <Suspense fallback="Loading permissions">
                    <SolutionPermissions organizationId="acme" solutionId="orders" onClose={close} />
                </Suspense>
            </ApiErrorContext>,
            async (output) => {
                await vi.waitFor(() =>
                    expect(output.querySelectorAll('button[aria-haspopup="listbox"]').length).toBe(3)
                );

                // Act
                for (const [name, role] of [
                    ['Alex', 'write'],
                    ['Blair', 'No access']
                ]) {
                    const trigger = output.querySelector<HTMLButtonElement>(`[aria-label="Role for ${name}"]`);
                    if (!trigger) throw new Error(`Expected role control for ${name}`);
                    await act(async () => user.click(trigger));

                    const list = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
                    const option = Array.from(list?.querySelectorAll<HTMLElement>('[role="option"]') ?? []).find(
                        (item) => item.textContent === role
                    );
                    if (!option) throw new Error(`Expected role option ${role}`);
                    await act(async () => user.click(option));
                }

                const save = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Save'
                );
                if (!save) throw new Error('Expected save control');
                await act(async () => user.click(save));

                // Assert
                await vi.waitFor(() => expect(reportError).toHaveBeenCalledOnce());
                expect(close).not.toHaveBeenCalled();
                expect(writes).toEqual([
                    { memberId: members[0].id, body: { role: 'write', revision_id: revision } },
                    { memberId: members[1].id, body: { role: null, revision_id: revision } }
                ]);
                expect(output.querySelector('[aria-label="Role for Alex"]')?.textContent).toBe('write');
                expect(output.querySelector('[aria-label="Role for Blair"]')?.textContent).toBe('No access');
                expect(output.querySelector('[aria-label="Role for Casey"]')?.textContent).toBe('read');
                expect(assignmentReads).toHaveLength(members.length);

                // Act
                await act(async () => user.click(save));

                // Assert
                await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
                expect(writes).toEqual([
                    { memberId: members[0].id, body: { role: 'write', revision_id: revision } },
                    { memberId: members[1].id, body: { role: null, revision_id: revision } },
                    { memberId: members[1].id, body: { role: null, revision_id: revision } }
                ]);
                expect(assignmentReads).toHaveLength(members.length);
            }
        );
    } finally {
        transport.mockRestore();
    }
});
