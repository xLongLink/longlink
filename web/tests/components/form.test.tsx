// @vitest-environment happy-dom
import { z } from 'zod';
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../render';
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
