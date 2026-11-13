// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act, Suspense } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import userEvent from '@testing-library/user-event';
import SolutionPermissions from '@/platform/routes/orgs/SolutionPermissions';

it('retains an explicit no-access draft after save failure and retries against the deployed revision', async () => {
    // Only transport is replaced: queries, picker selection, disabled save state, and retry stay real.
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
                { user: { id: member, name: 'Alex', email: 'alex@example.com', avatar: '' }, role: 'read' },
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
                await vi.waitFor(() => expect(output.querySelector('.view-picker-trigger')?.textContent).toBe('read'));
                const trigger = output.querySelector<HTMLButtonElement>('.view-picker-trigger');

                const save = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Save'
                );

                if (!trigger || !save) throw new Error('Expected permissions controls');

                expect(
                    trigger
                        .getAttribute('aria-labelledby')
                        ?.split(' ')
                        .map((id) => document.getElementById(id)?.textContent)
                        .join(' ')
                ).toContain('Role for Alex');
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
                expect(trigger.getAttribute('aria-disabled')).toBe('true');
                await act(async () => user.click(trigger));
                expect(trigger.getAttribute('aria-expanded')).toBe('false');
                expect(close).not.toHaveBeenCalled();
                await act(async () => finishFirstWrite(Response.json({ detail: 'Try again' }, { status: 409 })));
                await vi.waitFor(() => expect(reportError).toHaveBeenCalledOnce());
                expect(trigger.textContent).toBe('No access');
                await vi.waitFor(() => expect(trigger.getAttribute('aria-disabled')).not.toBe('true'));
                expect(close).not.toHaveBeenCalled();
                await act(async () => user.click(save));
                await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
                expect(writes).toEqual([
                    { role: null, revision_id: revision },
                    { role: null, revision_id: revision },
                ]);
            }
        );
    } finally {
        transport.mockRestore();
    }
});
