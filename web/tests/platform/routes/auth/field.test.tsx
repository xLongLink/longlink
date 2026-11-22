// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import { withMounted } from '../../../render';
import userEvent from '@testing-library/user-event';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@/platform/routes/auth/field';
import { emailPayloadSchema, type EmailPayload } from '@/platform/routes/auth/validation';

/** Exercises the same resolver and field ownership used by account email forms. */
function EmailForm({ onSubmit }: { onSubmit: (payload: EmailPayload) => void }) {
    const form = useForm<EmailPayload>({ defaultValues: { email: '' }, resolver: zodResolver(emailPayloadSchema) });

    return (
        <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <p id="email-help">Use an address you can access.</p>
            <TextField
                {...form.register('email')}
                error={form.formState.errors.email?.message}
                label="Email"
                labelHidden
                description="Work address"
                aria-describedby="email-help"
                required
                type="email"
                autoComplete="email"
            />
            <button type="submit">Continue</button>
        </form>
    );
}

it('recovers invalid auth input without losing accessible field text', async () => {
    const submissions: EmailPayload[] = [];

    await withMounted(<EmailForm onSubmit={(payload) => submissions.push(payload)} />, async (output) => {
        const events = userEvent.setup();
        const email = output.querySelector<HTMLInputElement>('input[name="email"]');
        const label = output.querySelector('label');
        const submit = output.querySelector('button');

        if (!email || !label || !submit) throw new Error('Missing email form');

        expect(label.classList.contains('sr-only')).toBe(true);
        expect(document.getElementById(email.getAttribute('aria-labelledby') ?? '')).toBe(label);
        await act(async () => events.click(label));
        expect(document.activeElement).toBe(email);
        expect(email.required).toBe(true);
        expect(email.getAttribute('aria-required')).toBe('true');

        await act(async () => events.click(submit));
        expect(document.activeElement).toBe(email);
        expect(email.getAttribute('aria-invalid')).toBe('true');
        const descriptionIds = email.getAttribute('aria-describedby')?.split(' ');

        if (!descriptionIds) throw new Error('Missing validation description');
        expect(descriptionIds.map((id) => document.getElementById(id)?.textContent)).toEqual([
            'Use an address you can access.',
            'Work address',
            'Email is required'
        ]);
        expect(submissions).toEqual([]);

        await act(async () => {
            await events.type(email, 'owner@example.com');
            await events.click(submit);
        });
        expect(submissions).toEqual([{ email: 'owner@example.com' }]);
        expect(email.getAttribute('aria-invalid')).not.toBe('true');
        expect(output.querySelector('[role="alert"]')).toBeNull();
        expect(
            email
                .getAttribute('aria-describedby')
                ?.split(' ')
                .map((id) => document.getElementById(id)?.textContent)
        ).toEqual(['Use an address you can access.', 'Work address']);
    });
});
