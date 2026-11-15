// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { act, type ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { TagForm } from '@/components/dialogs/tag-form';
import { InviteMember } from '@/components/dialogs/invite-member';

it.each([false, true])('submits the selected invitation role with admin access=%s', async (canInviteAdmin) => {
    const submitted = vi.fn<ComponentProps<typeof InviteMember>['onSubmit']>(async () => {});
    const user = userEvent.setup();

    await withMounted(
        <InviteMember open canInviteAdmin={canInviteAdmin} onSubmit={submitted} onOpenChange={() => {}} />,
        async () => {
            const email = document.getElementById('invite-email');
            const role = document.getElementById('invite-role');
            const form = email?.closest('form');

            if (!email || !role || !form) throw new Error('Expected invitation form');

            await act(async () => form.requestSubmit());
            expect(submitted).not.toHaveBeenCalled();
            expect(document.querySelector('[role="alert"]')).not.toBeNull();
            await act(async () => user.type(email, 'member@example.com'));
            await act(async () => user.click(role));
            const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
            expect(options.some((option) => option.textContent === 'admin')).toBe(canInviteAdmin);
            const selected = options.find((option) => option.textContent === (canInviteAdmin ? 'admin' : 'maintain'));

            if (!selected) throw new Error('Expected permitted role');
            await act(async () => user.click(selected));
            await act(async () => form.requestSubmit());
            await vi.waitFor(() => expect(submitted).toHaveBeenCalledOnce());
            expect(submitted.mock.calls[0][0]).toEqual({
                email: 'member@example.com',
                role: canInviteAdmin ? 'admin' : 'maintain'
            });
        }
    );
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
            <TagForm open base="/api/v1/organizations/test" tag={null} onSuccess={complete} onOpenChange={() => {}} />,
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
