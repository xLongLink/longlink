// @vitest-environment happy-dom
import { z } from 'zod';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import { act, type ContextType } from 'react';
import { ApiErrorContext } from '@/lib/errors';
import { ReportedError } from '@/lib/reported';
import type { ViewData } from '@/views/protocol';
import userEvent from '@testing-library/user-event';
import { useSubmit } from '@/views/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/longlink/form/input';
import { RequestContext } from '@/lib/view-capabilities';

it('blocks invalid data, surfaces a failed write, and retries the preserved draft without reporting success early', async () => {
    const request = vi
        .fn<NonNullable<ContextType<typeof RequestContext>>['request']>()
        .mockRejectedValueOnce(new ReportedError('Unavailable'))
        .mockResolvedValue({ id: 8 });
    const onSuccess = vi.fn();

    function Example() {
        const form = useForm({
            defaultValues: { title: '' },
            resolver: zodResolver(z.object({ title: z.string().trim().min(1, 'Enter a title.') }))
        });
        const submit = useSubmit('/api/tasks', {
            onSuccess,
            onError: (error) => form.setError('root', { message: error.message })
        });

        async function save(values: { title: string }) {
            const data = new FormData();
            data.append('title', values.title);
            await submit(data);
        }

        return (
            <form
                noValidate
                onSubmit={(event) => {
                    void form.handleSubmit(save)(event);
                    expect(event.defaultPrevented).toBe(true);
                }}
                data-success={form.formState.isSubmitSuccessful}
                aria-busy={form.formState.isSubmitting}
            >
                <Input {...form.register('title')} label="Title" error={form.formState.errors.title?.message} />
                <button type="submit">Save</button>
                {form.formState.errors.root?.message && <p role="alert">{form.formState.errors.root.message}</p>}
            </form>
        );
    }

    await withMounted(
        <RequestContext value={{ request }}>
            <Example />
        </RequestContext>,
        async (output) => {
            const input = output.querySelector('input');
            const button = output.querySelector('button');
            const form = output.querySelector('form');

            if (!input || !button || !form) throw new Error('Expected task form');
            const user = userEvent.setup();
            await act(async () => user.click(button));
            expect(request).not.toHaveBeenCalled();
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Enter a title.');
            await act(async () => user.type(input, ' Draft '));
            await act(async () => user.click(button));
            expect(request).toHaveBeenCalledTimes(1);
            expect(request.mock.calls[0]?.[1]?.form).toEqual([['title', 'Draft']]);
            expect(onSuccess).not.toHaveBeenCalled();
            expect(form.getAttribute('data-success')).toBe('false');
            expect(form.getAttribute('aria-busy')).toBe('false');
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Unavailable');
            expect(input.value).toBe(' Draft ');
            await act(async () => user.click(button));
            expect(request).toHaveBeenCalledTimes(2);
            expect(onSuccess).toHaveBeenCalledExactlyOnceWith({ id: 8 });
            expect(form.getAttribute('data-success')).toBe('true');
            expect(output.querySelector('[role="alert"]')).toBeNull();
            expect(input.value).toBe(' Draft ');
        }
    );
});

it('deduplicates overlapping writes through success callbacks while preserving parsed values and files', async () => {
    const files = [
        new File(['invoice'], 'invoice.txt', { type: 'text/plain' }),
        new File(['notes'], 'notes.txt', { type: 'text/plain' })
    ];
    let completeValidation: () => void = () => {};
    const validation = new Promise<void>((resolve) => {
        completeValidation = resolve;
    });
    const validate = vi.fn(async () => {
        await validation;
        return true;
    });
    const schema = z.object({
        quantity: z.string().regex(/^\d+$/).transform(Number).refine(validate),
        enabled: z.boolean(),
        tags: z.array(z.string()),
        files: z.array(z.instanceof(File))
    });
    let completeRequest: (data: ViewData) => void = () => {};
    let completeCallback: () => void = () => {};
    const response = new Promise<ViewData>((resolve) => {
        completeRequest = resolve;
    });
    const callback = new Promise<void>((resolve) => {
        completeCallback = resolve;
    });
    const request = vi.fn<NonNullable<ContextType<typeof RequestContext>>['request']>(() => response);
    const onSuccess = vi.fn(async (_data: ViewData) => {
        await callback;
    });

    function Example() {
        const form = useForm({
            resolver: zodResolver(schema),
            defaultValues: { quantity: '1', enabled: false, tags: ['design', 'engineering'], files }
        });
        const submit = useSubmit('/api/tasks', { method: 'PATCH', onSuccess });

        async function save(values: z.output<typeof schema>) {
            const data = new FormData();
            data.append('quantity', String(values.quantity));
            data.append('enabled', String(values.enabled));
            for (const tag of values.tags) data.append('tags', tag);
            for (const file of values.files) data.append('files', file);
            await submit(data);
        }

        return (
            <form
                onSubmit={form.handleSubmit(save)}
                aria-busy={form.formState.isSubmitting}
                data-success={form.formState.isSubmitSuccessful}
            >
                <Input {...form.register('quantity')} label="Quantity" />
                <button type="submit">Save</button>
            </form>
        );
    }

    await withMounted(
        <RequestContext value={{ request }}>
            <Example />
        </RequestContext>,
        async (output) => {
            const form = output.querySelector('form');
            const input = output.querySelector('input');

            if (!form || !input) throw new Error('Expected multipart form');
            const user = userEvent.setup();
            await act(async () => user.clear(input));
            await act(async () => user.type(input, '04'));
            await act(async () => {
                expect(form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))).toBe(false);
                expect(form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))).toBe(false);
            });
            expect(validate).toHaveBeenCalledTimes(2);
            expect(request).not.toHaveBeenCalled();
            expect(form.getAttribute('aria-busy')).toBe('true');
            await act(async () => {
                form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
            });
            expect(validate).toHaveBeenCalledTimes(3);
            await act(async () => completeValidation());
            expect(request).toHaveBeenCalledTimes(1);
            const [path, options] = request.mock.calls[0] ?? [];

            if (!options?.form) throw new Error('Expected scoped request');
            expect(path).toBe('/api/tasks');
            expect(options.method).toBe('PATCH');
            const data = new FormData();
            for (const [name, value] of options.form) data.append(name, value);
            expect(data.get('quantity')).toBe('4');
            expect(data.get('enabled')).toBe('false');
            expect(data.getAll('tags')).toEqual(['design', 'engineering']);
            const uploaded = data.getAll('files');
            expect(uploaded).toHaveLength(2);
            if (!(uploaded[0] instanceof File) || !(uploaded[1] instanceof File))
                throw new Error('Expected binary uploads');
            expect(uploaded[0].name).toBe('invoice.txt');
            expect(uploaded[0].type).toBe('text/plain');
            expect(await uploaded[0].text()).toBe('invoice');
            expect(uploaded[1].name).toBe('notes.txt');
            expect(await uploaded[1].text()).toBe('notes');
            expect(form.getAttribute('aria-busy')).toBe('true');
            await act(async () => completeRequest({ id: 7 }));
            expect(onSuccess).toHaveBeenCalledExactlyOnceWith({ id: 7 });
            expect(form.getAttribute('aria-busy')).toBe('true');
            await act(async () => {
                form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
            });
            expect(request).toHaveBeenCalledTimes(1);
            expect(validate).toHaveBeenCalledTimes(4);
            await act(async () => completeCallback());
            expect(form.getAttribute('aria-busy')).toBe('false');
            expect(form.getAttribute('data-success')).toBe('true');
            expect(input.value).toBe('04');
        }
    );
});

it.each([
    { cause: new Error('Unavailable'), reports: 1 },
    { cause: new ReportedError('Unavailable'), reports: 0 },
    { cause: 'Unavailable', reports: 1 }
])('preserves failed form state and permits retry when onError throws ($cause)', async ({ cause, reports }) => {
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
    let submit: (() => Promise<void>) | undefined;

    function Example() {
        const form = useForm({
            defaultValues: { title: 'Draft' },
            resolver: zodResolver(z.object({ title: z.string() }))
        });
        const send = useSubmit('/api/tasks', {
            onError: async (error) => {
                form.setError('root', { message: error.message });
                await onError(error);
            }
        });
        submit = form.handleSubmit(async (values) => {
            const data = new FormData();
            data.append('title', values.title);
            await send(data);
        });
        return (
            <form aria-busy={form.formState.isSubmitting} data-success={form.formState.isSubmitSuccessful}>
                <Input {...form.register('title')} label="Title" />
                {form.formState.errors.root?.message && <p role="alert">{form.formState.errors.root.message}</p>}
            </form>
        );
    }

    await withMounted(
        <ApiErrorContext value={reportError}>
            <RequestContext value={{ request }}>
                <Example />
            </RequestContext>
        </ApiErrorContext>,
        async (output) => {
            if (!submit) throw new Error('Expected form submission');

            // Act
            await act(async () => {
                if (!submit) throw new Error('Expected form submission');
                const submission = submit();
                await expect(submission).rejects.toBe(callbackError);
            });

            // Assert
            expect(request).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
            expect(reportError).toHaveBeenCalledTimes(reports);
            const error = onError.mock.calls[0]?.[0];
            expect(output.querySelector('[role="alert"]')?.textContent).toBe(error?.message);
            expect(output.querySelector('form')?.getAttribute('aria-busy')).toBe('false');
            expect(output.querySelector('form')?.getAttribute('data-success')).toBe('false');
            expect(output.querySelector('input')?.value).toBe('Draft');

            await act(async () => submit?.());
            expect(request).toHaveBeenCalledTimes(2);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(output.querySelector('form')?.getAttribute('data-success')).toBe('true');
            expect(output.querySelector('[role="alert"]')).toBeNull();
        }
    );
});
