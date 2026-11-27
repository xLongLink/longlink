// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import type { ContextType } from 'react';
import { ApiErrorContext } from '@/lib/errors';
import { ReportedError } from '@/lib/reported';
import { useSubmit } from '@/lib/hooks/use-submit';
import userEvent from '@testing-library/user-event';
import { RequestContext } from '@/lib/view-capabilities';
import { Controller, Form, useForm } from '@/components/longlink';

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
        <RequestContext value={request}>
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
            .fn<NonNullable<ContextType<typeof RequestContext>>>()
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
                <RequestContext value={request}>
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

it('keeps the admitted form input through error handling, then submits current drafts on retry', async () => {
    // Arrange
    let finishHandling: () => void;
    let startedHandling: () => void;
    const handling = new Promise<void>((resolve) => {
        finishHandling = resolve;
    });
    const started = new Promise<void>((resolve) => {
        startedHandling = resolve;
    });
    const request = vi
        .fn<NonNullable<ContextType<typeof RequestContext>>>()
        .mockRejectedValueOnce(new ReportedError('Unavailable'))
        .mockResolvedValue(null);
    const onError = async () => {
        startedHandling();
        await handling;
    };
    let form: ReturnType<typeof useForm<{ title: string }>> | undefined;

    function Example() {
        form = useForm('/api/tasks', { defaultValues: { title: 'Draft' }, onError });
        return null;
    }

    await withMounted(
        <RequestContext value={request}>
            <Example />
        </RequestContext>,
        async () => {
            if (!form) throw new Error('Expected form submission');

            // Act
            const first = form.submit({ title: 'First' });
            const duplicate = form.submit({ title: 'Duplicate' });
            await started;
            const duringHandling = form.submit({ title: 'Still duplicate' });
            finishHandling();
            await first;
            await form.submit();

            // Assert
            expect(duplicate).toBe(first);
            expect(duringHandling).toBe(first);
            expect(request.mock.calls).toEqual([
                ['/api/tasks', { method: 'POST', form: [['title', 'First']] }],
                ['/api/tasks', { method: 'POST', form: [['title', 'Draft']] }]
            ]);
            expect(form.getValues()).toEqual({ title: 'Draft' });
        }
    );
});

it('shares callback submissions until asynchronous error handling finishes and admits a retry', async () => {
    // Arrange
    let finishHandling: () => void;
    let startedHandling: () => void;
    const handling = new Promise<void>((resolve) => {
        finishHandling = resolve;
    });
    const started = new Promise<void>((resolve) => {
        startedHandling = resolve;
    });
    const cause = new Error('Unavailable');
    const action = vi.fn<(value: string) => Promise<void>>().mockRejectedValueOnce(cause).mockResolvedValue(undefined);
    const reportError = vi.fn();
    const onError = vi.fn(async () => {
        startedHandling();
        await handling;
    });
    let submit: ((value: string) => Promise<void>) | undefined;

    function Example() {
        submit = useSubmit(action, { onError });
        return null;
    }

    await withMounted(
        <ApiErrorContext value={reportError}>
            <Example />
        </ApiErrorContext>,
        async () => {
            if (!submit) throw new Error('Expected callback submission');

            // Act
            const first = submit('First');
            const duplicate = submit('Duplicate');
            await started;
            const duringHandling = submit('Still duplicate');
            finishHandling();
            await first;
            await submit('Retry');

            // Assert
            expect(duplicate).toBe(first);
            expect(duringHandling).toBe(first);
            expect(action.mock.calls).toEqual([['First'], ['Retry']]);
            expect(reportError).toHaveBeenCalledExactlyOnceWith(cause);
            expect(onError).toHaveBeenCalledExactlyOnceWith(cause);
        }
    );
});
