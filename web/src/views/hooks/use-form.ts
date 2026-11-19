import type { z } from 'zod';
import * as forms from 'react-hook-form';
import * as multipart from '../multipart';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, type BaseSyntheticEvent } from 'react';
import { useScopedWrite, type SubmitOptions } from './use-submit';
import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';

/** Validates editing values and optionally submits parsed output through the scoped multipart transport. */
export function useForm<Input extends FieldValues, Context = unknown, Output extends FieldValues = Input>(
    schema: z.ZodType<Output, Input>,
    options?: Omit<UseFormProps<Input, Context, Output>, 'resolver'> & SubmitOptions & { action?: string }
): UseFormReturn<Input, Context, Output> & { submit: (event?: BaseSyntheticEvent) => Promise<void> } {
    const { action, method, onSuccess, onError, ...formOptions } = options ?? {};
    const form = forms.useForm<Input, Context, Output>({ ...formOptions, resolver: zodResolver(schema) });
    const write = useScopedWrite({ method, onSuccess });
    const send = useSubmit(
        form.handleSubmit(async (values) => {
            if (!action) throw new Error('Form submissions require an action.');
            await write(action, multipart.encode(values));
        }),
        {
            onError: async (error) => {
                form.setError('root', { type: 'submit', message: error.message || 'Submission failed' });
                await onError?.(error);
            }
        }
    );

    const submit = useCallback(
        (event?: BaseSyntheticEvent) => {
            event?.preventDefault();
            return send(event);
        },
        [send]
    );

    return { ...form, submit };
}
