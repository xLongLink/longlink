import type { z } from 'zod';
import * as forms from 'react-hook-form';
import * as multipart from '../multipart';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useRef, type BaseSyntheticEvent } from 'react';
import { useSubmit, type SubmitOptions } from '@/lib/hooks/use-submit';
import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';

/** Validates editing values and optionally submits parsed output through the scoped multipart transport. */
export function useForm<Input extends FieldValues, Context = unknown, Output extends FieldValues = Input>(
    schema: z.ZodType<Output, Input>,
    options?: Omit<UseFormProps<Input, Context, Output>, 'resolver'> & SubmitOptions & { action?: string }
): UseFormReturn<Input, Context, Output> & { submit: (event?: BaseSyntheticEvent) => Promise<void> } {
    const { action, method, onSuccess, onError, ...formOptions } = options ?? {};
    const form = forms.useForm<Input, Context, Output>({ ...formOptions, resolver: zodResolver(schema) });
    const send = useSubmit(action ?? '', { method, onSuccess });
    const pending = useRef<Promise<void> | null>(null);

    // Guard the whole validation and submission lifecycle, including repeated events and async callbacks.
    const submit = useCallback(
        (event?: BaseSyntheticEvent) => {
            event?.preventDefault();
            event?.persist();
            if (pending.current) return pending.current;

            const submission = Promise.resolve()
                .then(() =>
                    form.handleSubmit(async (values) => {
                        try {
                            if (!action) throw new Error('Form submissions require an action.');
                            await send(multipart.encode(values));
                        } catch (cause) {
                            const error = cause instanceof Error ? cause : new Error('Submission failed', { cause });
                            form.setError('root', { type: 'submit', message: error.message || 'Submission failed' });
                            await onError?.(error);
                        }
                    })(event)
                )
                .finally(() => {
                    pending.current = null;
                });

            pending.current = submission;
            return submission;
        },
        [action, form, onError, send]
    );

    return { ...form, submit };
}
