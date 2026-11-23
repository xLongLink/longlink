// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { RequestContext } from '@/lib/view-capabilities';
import { useForm } from '@/components/longlink/hooks/use-form';
import type { FormOptions } from '@/components/longlink/hooks/use-form';

it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
    'submits %s through the scoped bridge without flattening multipart entries',
    async (method) => {
        // Arrange
        const file = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' });
        const data = new FormData();
        data.append('tag', 'red');
        data.append('tag', 'blue');
        data.append('decision', 'save');
        data.append('attachment', file);
        const request = vi.fn().mockResolvedValue(null);
        let submit: ((data: FormData) => Promise<void>) | undefined;

        function Example() {
            submit = useForm('/api/orders', { method }).submit;

            return null;
        }

        await withMounted(
            <RequestContext value={request}>
                <Example />
            </RequestContext>,
            async () => {
                // Act
                await act(async () => {
                    if (!submit) throw new Error('Expected scoped submission');
                    await submit(data);
                });

                // Assert
                expect(request).toHaveBeenCalledExactlyOnceWith('/api/orders', {
                    method,
                    form: [
                        ['tag', 'red'],
                        ['tag', 'blue'],
                        ['decision', 'save'],
                        ['attachment', file]
                    ]
                });
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
        submit = useForm('/api/orders', { onSuccess }).submit;
        return null;
    }

    await withMounted(
        <RequestContext value={request}>
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
        submit = useForm('/api/orders', { method: 'GET' as FormOptions['method'], onError }).submit;
        return null;
    }

    await withMounted(
        <RequestContext value={request}>
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

it('rejects callback endpoints without invoking them or reaching scoped transport', async () => {
    // Arrange
    const request = vi.fn().mockResolvedValue(null);
    const action = vi.fn();
    const onError = vi.fn();
    let submit: ((data: FormData) => Promise<void>) | undefined;

    function Example() {
        // @ts-expect-error Callback submissions are not part of the public Views API.
        submit = useForm(action, { onError }).submit;
        return null;
    }

    await withMounted(
        <RequestContext value={request}>
            <Example />
        </RequestContext>,
        async () => {
            if (!submit) throw new Error('Expected scoped submission');

            // Act
            await submit(new FormData());

            // Assert
            expect(action).not.toHaveBeenCalled();
            expect(request).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalledExactlyOnceWith(new Error('Scoped submissions require an endpoint path'));
        }
    );
});
