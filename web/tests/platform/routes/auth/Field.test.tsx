// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import { withMounted } from '../../../render';
import userEvent from '@testing-library/user-event';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@/platform/routes/auth/Field';
import { emailPayloadSchema, type EmailPayload } from '@/platform/routes/auth/validation';

/** Exercises the same resolver and field ownership used by account email forms. */
function EmailForm({ onSubmit }: { onSubmit: (payload: EmailPayload) => void }) {
    const form = useForm<EmailPayload>({
        defaultValues: { email: '' },
        resolver: zodResolver(emailPayloadSchema),
    });

    return (
        <form noValidate action={() => form.handleSubmit(onSubmit)()}>
            <TextField control={form.control} name="email" label="Email" required type="email" autoComplete="email" />
            <button type="submit">Continue</button>
        </form>
    );
}

it('focuses invalid auth input, exposes its error, and submits the corrected owned value', async () => {
    const submissions: EmailPayload[] = [];

    await withMounted(<EmailForm onSubmit={(payload) => submissions.push(payload)} />, async (output) => {
        const events = userEvent.setup();
        const email = output.querySelector<HTMLInputElement>('input[name="email"]');
        const submit = output.querySelector('button');

        if (!email || !submit) throw new Error('Missing email form');

        await act(async () => events.click(submit));
        expect(document.activeElement).toBe(email);
        expect(email.getAttribute('aria-invalid')).toBe('true');
        const errorId = email.getAttribute('aria-describedby');

        if (!errorId) throw new Error('Missing validation description');
        expect(document.getElementById(errorId)?.textContent).toBe('Email is required');
        expect(submissions).toEqual([]);

        await act(async () => {
            await events.type(email, 'owner@example.com');
            await events.click(submit);
        });
        expect(submissions).toEqual([{ email: 'owner@example.com' }]);
        expect(email.getAttribute('aria-invalid')).not.toBe('true');
        expect(output.querySelector('[role="alert"]')).toBeNull();
    });
});
