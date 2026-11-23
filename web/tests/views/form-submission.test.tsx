// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import type { ContextType } from 'react';
import { ApiErrorContext } from '@/lib/errors';
import { ReportedError } from '@/lib/reported';
import { Controller, Form, useForm } from '@/views';
import userEvent from '@testing-library/user-event';
import { RequestContext } from '@/lib/view-capabilities';

it('submits a controlled field through a public View form', async () => {
    // Arrange
    const request = vi.fn().mockResolvedValue(null);
    const user = userEvent.setup();

    function Example() {
        const form = useForm('/api/tasks', { defaultValues: { title: 'Write release notes' } });
        return (
            <Form aria-label="Task" noValidate onSubmit={form.onSubmit}>
                <Controller
                    control={form.control}
                    name="title"
                    render={({ field }) => <input aria-label="Title" {...field} />}
                />
                <button type="submit">Save</button>
            </Form>
        );
    }

    await withMounted(
        <RequestContext value={{ request }}>
            <Example />
        </RequestContext>,
        async (output) => {
            const title = output.querySelector<HTMLInputElement>('input[aria-label="Title"]');
            const submit = output.querySelector<HTMLButtonElement>('form[aria-label="Task"] button[type="submit"]');
            if (!title || !submit) throw new Error('Expected a title field and submit button inside the task form');

            // Act
            await act(async () => {
                await user.clear(title);
                await user.type(title, 'Publish release notes');
                await user.click(submit);
            });

            // Assert
            expect(request).toHaveBeenCalledExactlyOnceWith('/api/tasks', {
                method: 'POST',
                form: [['title', 'Publish release notes']]
            });
        }
    );
});

it.each([
    { cause: new ReportedError('Unavailable'), reports: 0 },
    { cause: 'Unavailable', reports: 1 }
])(
    'reports write failures appropriately and permits retry when onError throws ($cause)',
    async ({ cause, reports }) => {
        // Arrange
        const request = vi
            .fn<NonNullable<ContextType<typeof RequestContext>>['request']>()
            .mockRejectedValueOnce(cause)
            .mockResolvedValue(null);
        const reportError = vi.fn();
        const callbackError = new Error('Callback failed');
        const onError = vi.fn(async (_error: Error) => {
            throw callbackError;
        });
        let submit: ((data: FormData) => Promise<void>) | undefined;

        function Example() {
            submit = useForm('/api/tasks', { onError }).submit;
            return null;
        }

        await withMounted(
            <ApiErrorContext value={reportError}>
                <RequestContext value={{ request }}>
                    <Example />
                </RequestContext>
            </ApiErrorContext>,
            async () => {
                if (!submit) throw new Error('Expected form submission');

                // Act
                await expect(submit(new FormData())).rejects.toBe(callbackError);
                await expect(submit(new FormData())).resolves.toBeUndefined();

                // Assert
                expect(request).toHaveBeenCalledTimes(2);
                expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
                expect(reportError).toHaveBeenCalledTimes(reports);
            }
        );
    }
);
