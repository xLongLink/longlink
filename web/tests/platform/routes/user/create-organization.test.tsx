// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import userEvent from '@testing-library/user-event';
import CreateOrganization from '@/components/dialogs/create-organization';

it('validates and retries organization creation through the fixed footer without losing the name', async () => {
    const writes: unknown[] = [];
    const complete = vi.fn(async () => {});
    const user = userEvent.setup();
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        if (request.method !== 'POST' || new URL(request.url).pathname !== '/api/v1/organizations') {
            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        }
        writes.push(await request.json());
        return writes.length === 1
            ? Response.json({ detail: 'Unavailable' }, { status: 503 })
            : new Response(null, { status: 204 });
    });

    try {
        await withMounted(<CreateOrganization onOpenChange={() => undefined} onSuccess={complete} />, async () => {
            const dialog = document.querySelector('[role="dialog"]');

            // Assert
            expect(dialog?.textContent).toContain('New organization');
            expect(dialog?.querySelector('input[name="name"]')?.getAttribute('aria-required')).toBe('true');

            const input = dialog?.querySelector<HTMLInputElement>('input[name="name"]');
            const submit = dialog?.querySelector<HTMLButtonElement>(
                '[data-slot="dialog-footer"] button[type="submit"]'
            );
            if (!input || !submit) throw new Error('Expected organization form and footer');

            // Footer submission must validate before issuing any write.
            await act(async () => user.click(submit));

            expect(dialog?.querySelector('[role="alert"]')?.textContent).toBe('Please complete this field.');
            expect(writes).toEqual([]);
            expect(complete).not.toHaveBeenCalled();
            await act(async () => user.type(input, '  Operations  '));
            await act(async () => user.click(submit));
            await vi.waitFor(() => expect(dialog?.textContent).toContain('Could not create the organization.'));
            expect(input.value).toBe('  Operations  ');
            expect(writes).toEqual([{ name: 'Operations' }]);
            expect(complete).not.toHaveBeenCalled();

            // The retained draft can be retried without reopening the dialog.
            await act(async () => user.click(submit));
            await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
            expect(writes).toEqual([{ name: 'Operations' }, { name: 'Operations' }]);
        });
    } finally {
        transport.mockRestore();
    }
});
