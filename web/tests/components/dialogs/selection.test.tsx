// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { useApi } from '@/lib/hooks/use-api';
import { ApiErrorContext } from '@/lib/errors';
import userEvent from '@testing-library/user-event';
import { TagForm } from '@/components/dialogs/tag-form';
import { InviteMember } from '@/components/dialogs/invite-member';
import { zOrganizationInvitationResponse } from '@/lib/generated/platform-api-v1/zod.gen';

function Invitations() {
    const [invitations] = useApi('/api/v1/organizations/test/invitations', zOrganizationInvitationResponse.array());

    return <output>{invitations.length}</output>;
}

it.each([false, true])('submits the selected invitation role with admin access=%s', async (canInviteAdmin) => {
    // Arrange
    const writes: unknown[] = [];
    const complete = vi.fn();
    const user = userEvent.setup();
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (request.method !== 'POST' || new URL(request.url).pathname !== '/api/v1/organizations/test/invitations') {
            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        }

        writes.push(await request.json());

        return new Response(null, { status: 204 });
    });

    try {
        await withMounted(
            <InviteMember base="/api/v1/organizations/test" canInviteAdmin={canInviteAdmin} onOpenChange={complete} />,
            async () => {
                const email = document.getElementById('invite-email');
                const role = document.getElementById('invite-role');
                const form = email?.closest('form');

                if (!email || !role || !form) throw new Error('Expected invitation form');

                // Act
                await act(async () => form.requestSubmit());
                expect(writes).toEqual([]);
                expect(document.querySelector('[role="alert"]')).not.toBeNull();
                await act(async () => user.type(email, 'member@example.com'));
                await act(async () => user.click(role));
                const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
                expect(options.some((option) => option.textContent === 'admin')).toBe(canInviteAdmin);
                const selected = options.find(
                    (option) => option.textContent === (canInviteAdmin ? 'admin' : 'maintain')
                );

                if (!selected) throw new Error('Expected permitted role');
                await act(async () => user.click(selected));
                await act(async () => form.requestSubmit());
                // Assert
                await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
                expect(complete).toHaveBeenCalledWith(false);
                expect(writes).toEqual([{ email: 'member@example.com', role: canInviteAdmin ? 'admin' : 'maintain' }]);
            }
        );
    } finally {
        transport.mockRestore();
    }
});

it('refreshes invitations after failed delivery and preserves the draft for retry', async () => {
    // Arrange
    const complete = vi.fn();
    const reportError = vi.fn();
    const user = userEvent.setup();
    const writes: unknown[] = [];
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        if (new URL(request.url).pathname !== '/api/v1/organizations/test/invitations') {
            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        }
        if (request.method === 'POST') {
            writes.push(await request.json());
            return writes.length === 1
                ? Response.json({ detail: 'Delivery failed' }, { status: 503 })
                : new Response(null, { status: 204 });
        }
        return Response.json(
            writes.length
                ? [
                      {
                          id: '00000000-0000-4000-8000-000000000005',
                          email: 'member@example.com',
                          role: 'write',
                          created_at: '2026-10-02T00:00:00Z'
                      }
                  ]
                : []
        );
    });

    try {
        await withMounted(
            <ApiErrorContext value={reportError}>
                <Invitations />
                <InviteMember base="/api/v1/organizations/test" canInviteAdmin onOpenChange={complete} />
            </ApiErrorContext>,
            async (output) => {
                await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('0'));
                const email = document.querySelector<HTMLInputElement>('#invite-email');
                const form = email?.closest('form');
                if (!email || !form) throw new Error('Expected invitation form');

                // Act
                await act(async () => {
                    await user.type(email, 'member@example.com');
                    form.requestSubmit();
                });

                // Assert
                await vi.waitFor(() => expect(output.querySelector('output')?.textContent).toBe('1'));
                await vi.waitFor(() =>
                    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
                        'Could not send the invitation'
                    )
                );
                expect(complete).not.toHaveBeenCalled();
                expect(reportError).toHaveBeenCalledOnce();
                expect(email.value).toBe('member@example.com');

                await act(async () => form.requestSubmit());
                await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
                expect(writes).toEqual([
                    { email: 'member@example.com', role: 'write' },
                    { email: 'member@example.com', role: 'write' }
                ]);
            }
        );
    } finally {
        transport.mockRestore();
    }
});

it('saves a searched icon identifier and trimmed name through the controlled tab form', async () => {
    const writes: unknown[] = [];
    const complete = vi.fn(async () => {});
    const user = userEvent.setup();

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (request.method !== 'POST' || new URL(request.url).pathname !== '/api/v1/organizations/test/tags') {
            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        }

        writes.push(await request.json());

        return new Response(null, { status: 204 });
    });

    try {
        await withMounted(
            <TagForm base="/api/v1/organizations/test" tag={null} onSuccess={complete} onOpenChange={() => {}} />,
            async () => {
                const name = document.getElementById('tag-name');
                const icon = document.getElementById('tag-icon');
                const form = name?.closest('form');

                if (!name || !icon || !form) throw new Error('Expected tab form');

                await act(async () => form.requestSubmit());
                expect(writes).toEqual([]);
                await act(async () => user.type(name, '  Operations  '));
                await act(async () => user.clear(icon));
                await act(async () => user.type(icon, 'Tools'));

                const tools = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
                    (option) => option.textContent === 'Tools'
                );

                if (!tools) throw new Error('Expected matching Tools icon');
                expect(tools.querySelector('svg')).not.toBeNull();
                await act(async () => user.click(tools));
                await act(async () => form.requestSubmit());
                await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
                expect(writes).toEqual([{ name: 'Operations', icon: 'wrench' }]);
            }
        );
    } finally {
        transport.mockRestore();
    }
});
