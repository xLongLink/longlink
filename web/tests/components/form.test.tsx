// @vitest-environment happy-dom
import { z } from 'zod';
import { act } from 'react';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import { ReportedError } from '@/lib/reported';
import { useSubmit } from '@/lib/hooks/use-submit';
import userEvent from '@testing-library/user-event';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/longlink/form/input';

it('rejects invalid values, guards duplicate writes, and preserves the draft after a reported failure for retry', async () => {
    // A pending or failed write must not duplicate a mutation or destroy an edited draft.
    const schema = z.object({ email: z.email() });
    const submissions: { email: string }[] = [];
    let reject: (error: Error) => void = () => {};

    const user = userEvent.setup();

    function Example() {
        const form = useForm({ defaultValues: { email: '' }, resolver: zodResolver(schema) });

        const submit = useSubmit(
            async (values: z.output<typeof schema>) => {
                submissions.push(values);

                if (submissions.length === 1)
                    await new Promise<void>((_resolve, fail) => {
                        reject = fail;
                    });
            },
            { onError: () => form.setError('root', { message: 'Could not save. Please try again.' }) }
        );

        return (
            <form onSubmit={form.handleSubmit(submit)} noValidate data-success={form.formState.isSubmitSuccessful}>
                <fieldset disabled={form.formState.isSubmitting}>
                    <p id="policy">Only work accounts.</p>
                    <Input
                        {...form.register('email')}
                        id="email"
                        label="Email"
                        description="Your account email."
                        aria-describedby="policy"
                        error={form.formState.errors.email?.message}
                    />
                    <button type="submit">Save</button>
                    {form.formState.errors.root?.message && <p role="alert">{form.formState.errors.root.message}</p>}
                </fieldset>
            </form>
        );
    }

    await withMounted(<Example />, async (output) => {
        const form = output.querySelector('form');
        const input = output.querySelector('input');

        if (!form || !input) throw new Error('Expected the email form');

        await act(async () => {
            form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
        });
        expect(submissions).toEqual([]);
        expect(output.querySelector('[role="alert"]')?.textContent).toBeTruthy();
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(
            input
                .getAttribute('aria-describedby')
                ?.split(' ')
                .map((id) => document.getElementById(id)?.textContent)
        ).toEqual(['Only work accounts.', 'Your account email.', expect.any(String)]);
        expect(document.activeElement).toBe(input);

        await act(async () => user.type(input, 'mara@example.com'));
        await act(async () => {
            form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
            form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
        });
        expect(submissions).toEqual([{ email: 'mara@example.com' }]);
        expect(input.getAttribute('aria-invalid')).not.toBe('true');
        expect(input.getAttribute('aria-describedby')).toBe('policy email-description');
        expect(output.querySelector('#email-error')).toBeNull();
        expect(input.closest('fieldset')?.disabled).toBe(true);

        await act(async () => reject(new ReportedError('Unavailable')));
        expect(input.value).toBe('mara@example.com');
        expect(input.closest('fieldset')?.disabled).toBe(false);
        expect(form.getAttribute('data-success')).toBe('false');
        expect(output.textContent).toContain('Could not save. Please try again.');
        await act(async () => {
            form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
        });
        expect(submissions).toEqual([{ email: 'mara@example.com' }, { email: 'mara@example.com' }]);
        expect(form.getAttribute('data-success')).toBe('true');
    });
});

it('validates asynchronously on blur, submits parsed output, and resets to explicit editing defaults', async () => {
    const schema = z.object({
        quantity: z
            .string()
            .trim()
            .min(1)
            .transform(Number)
            .pipe(z.number().int().positive())
            .refine(async (quantity) => quantity <= 12, 'Only 12 are available.')
    });
    const saved: z.output<typeof schema>[] = [];

    function Example() {
        const form = useForm({ defaultValues: { quantity: '2' }, mode: 'onBlur', resolver: zodResolver(schema) });

        return (
            <form
                noValidate
                onSubmit={form.handleSubmit((values) => {
                    saved.push(values);
                })}
            >
                <Input
                    {...form.register('quantity')}
                    label="Quantity"
                    error={form.formState.errors.quantity?.message}
                />
                <button type="submit">Save</button>
                <button type="button" onClick={() => form.reset()}>
                    Reset
                </button>
            </form>
        );
    }

    await withMounted(<Example />, async (output) => {
        const input = output.querySelector('input');
        const save = output.querySelector('button[type="submit"]');
        const reset = output.querySelector('button[type="button"]');

        if (!input || !save || !reset) throw new Error('Expected quantity controls');
        const user = userEvent.setup();
        await act(async () => user.clear(input));
        await act(async () => user.type(input, '13'));
        await act(async () => user.tab());
        await vi.waitFor(() =>
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Only 12 are available.')
        );
        await act(async () => user.click(save));
        expect(saved).toEqual([]);
        expect(input.value).toBe('13');
        await act(async () => user.clear(input));
        await act(async () => user.type(input, ' 7 '));
        await act(async () => user.click(save));
        expect(saved).toEqual([{ quantity: 7 }]);
        expect(input.value).toBe(' 7 ');
        await act(async () => user.click(reset));
        expect(output.querySelector('input')?.value).toBe('2');
        expect(output.querySelector('[role="alert"]')).toBeNull();
    });
});
