// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { useSubmit } from '@/views/hooks/use-submit';
import { RequestContext } from '@/lib/view-capabilities';
import type { SubmitOptions } from '@/views/hooks/use-submit';

it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
    'submits %s through the scoped bridge without flattening repeated names, uploads, or submitter values',
    async (method) => {
        const file = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' });
        const submissions: [string, string, [string, string | Blob][]][] = [];
        let completed = false;

        function Example() {
            const submit = useSubmit('/api/orders', {
                method,
                onSuccess: () => {
                    completed = true;
                }
            });

            return (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget, event.nativeEvent.submitter);
                        data.append('attachment', file);
                        void submit(data);
                    }}
                >
                    <input name="tag" defaultValue="red" />
                    <input name="tag" defaultValue="blue" />
                    <input name="excluded" defaultValue="private" disabled />
                    <button type="submit" name="decision" value="save">
                        Save
                    </button>
                </form>
            );
        }

        await withMounted(
            <RequestContext
                value={{
                    request: async (path, options) => {
                        if (!options?.form || !options.method) throw new Error('Expected a write request');
                        submissions.push([path, options.method, options.form]);
                        expect(completed).toBe(false);

                        return null;
                    }
                }}
            >
                <Example />
            </RequestContext>,
            async (output) => {
                const button = output.querySelector('button');

                if (!button) throw new Error('Expected the submit button');
                await act(async () => button.click());
                expect(submissions).toEqual([
                    [
                        '/api/orders',
                        method,
                        [
                            ['tag', 'red'],
                            ['tag', 'blue'],
                            ['decision', 'save'],
                            ['attachment', file]
                        ]
                    ]
                ]);
                expect(completed).toBe(true);
            }
        );
    }
);

it('keeps a scoped submission guarded until its success callback completes', async () => {
    // Arrange
    const request = vi.fn().mockResolvedValue(null);
    let complete: () => void = () => {};
    const completion = new Promise<void>((resolve) => {
        complete = resolve;
    });
    const onSuccess = vi.fn(async () => {
        await completion;
    });
    let submit: ((data: FormData) => Promise<void>) | undefined;

    function Example() {
        submit = useSubmit('/api/orders', { onSuccess });
        return null;
    }

    await withMounted(
        <RequestContext value={{ request }}>
            <Example />
        </RequestContext>,
        async () => {
            if (!submit) throw new Error('Expected scoped submission');

            // Act
            const submission = submit(new FormData());
            expect(submit(new FormData())).toBe(submission);
            await act(async () => {});

            // Assert
            expect(onSuccess).toHaveBeenCalledTimes(1);
            expect(submit(new FormData())).toBe(submission);
            expect(request).toHaveBeenCalledTimes(1);
            complete();
            await submission;
            await submit(new FormData());
            expect(request).toHaveBeenCalledTimes(2);
        }
    );
});

it('rejects unsupported runtime write methods before reaching scoped transport', async () => {
    // Arrange
    const request = vi.fn().mockResolvedValue(null);
    const onError = vi.fn();
    let submit: ((data: FormData) => Promise<void>) | undefined;

    function Example() {
        submit = useSubmit('/api/orders', { method: 'GET' as SubmitOptions['method'], onError });
        return null;
    }

    await withMounted(
        <RequestContext value={{ request }}>
            <Example />
        </RequestContext>,
        async () => {
            if (!submit) throw new Error('Expected scoped submission');

            // Act
            await submit(new FormData());

            // Assert
            expect(request).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalledExactlyOnceWith(new Error('Unsupported write method'));
        }
    );
});
