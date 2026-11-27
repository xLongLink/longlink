// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import userEvent from '@testing-library/user-event';
import CreateOrganization from '@/platform/routes/user/dialogs/create-organization';

it('validates and retries organization creation without losing the name', async () => {
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
        await withMounted(<CreateOrganization onClose={() => undefined} onSuccess={complete} />, async () => {
            const dialog = document.querySelector('[role="dialog"]');

            const input = dialog?.querySelector<HTMLInputElement>('input[name="name"]');
            const submit = dialog?.querySelector<HTMLButtonElement>('form button[type="submit"]');
            if (!input || !submit) throw new Error('Expected organization form and submit button');

            // Submission must validate before issuing any write.
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

it('keeps submission pending until the request and parent success workflow finish', async () => {
    // Arrange
    let finishRequest: (response: Response) => void = () => undefined;
    let finishSuccess: () => void = () => undefined;
    const response = new Promise<Response>((resolve) => {
        finishRequest = resolve;
    });
    const success = new Promise<void>((resolve) => {
        finishSuccess = resolve;
    });
    const complete = vi.fn(async () => {
        await success;
    });
    const close = vi.fn();
    const user = userEvent.setup();
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response);

    try {
        await withMounted(<CreateOrganization onClose={close} onSuccess={complete} />, async () => {
            const dialog = document.querySelector('[role="dialog"]');
            const input = dialog?.querySelector<HTMLInputElement>('input[name="name"]');
            const submit = dialog?.querySelector<HTMLButtonElement>('form button[type="submit"]');
            const fieldset = dialog?.querySelector('fieldset');
            if (!input || !submit || !fieldset) throw new Error('Expected the organization form');

            // Act
            await act(async () => user.type(input, 'Operations'));
            await act(async () => user.click(submit));

            // Assert
            expect(transport).toHaveBeenCalledOnce();
            expect(complete).not.toHaveBeenCalled();
            expect(fieldset.disabled).toBe(true);

            // Act
            await act(async () => finishRequest(new Response(null, { status: 204 })));
            await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
            await act(async () => user.click(submit));

            // Assert
            expect(fieldset.disabled).toBe(true);
            expect(input.value).toBe('Operations');
            expect(transport).toHaveBeenCalledOnce();
            expect(close).not.toHaveBeenCalled();

            // Act
            await act(async () => finishSuccess());

            // Assert
            await vi.waitFor(() => expect(fieldset.disabled).toBe(false));
            expect(close).not.toHaveBeenCalled();
        });
    } finally {
        finishRequest(new Response(null, { status: 204 }));
        finishSuccess();
        transport.mockRestore();
    }
});
