import type { z } from 'zod';
import * as forms from 'react-hook-form';
import * as multipart from '../multipart';
import { zodResolver } from '@hookform/resolvers/zod';
import { RequestContext } from '@/components/custom/contexts';
import { useSubmit, type SubmitOptions } from '@/lib/hooks/use-submit';
import { useCallback, useContext, type BaseSyntheticEvent } from 'react';
import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';

/** Validates editing values and optionally submits parsed output through the scoped multipart transport. */
export function useForm<Input extends FieldValues, Context = unknown, Output extends FieldValues = Input>(
    schema: z.ZodType<Output, Input>,
    options?: Omit<UseFormProps<Input, Context, Output>, 'resolver'> & SubmitOptions & { action?: string }
): UseFormReturn<Input, Context, Output> & { submit: (event?: BaseSyntheticEvent) => Promise<void> } {
    const { action, method, onSuccess, onError, ...formOptions } = options ?? {};
    const form = forms.useForm<Input, Context, Output>({ ...formOptions, resolver: zodResolver(schema) });
    const request = useContext(RequestContext)?.request;
    const send = useSubmit(
        form.handleSubmit(async (values) => {
            if (!action) throw new Error('Form submissions require an action.');
            if (!request) throw new Error('Scoped submissions require the Solution runtime');
            if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method ?? 'POST'))
                throw new Error('Unsupported write method');

            const data = multipart.encode(values);
            const result = await request(action, { method: method ?? 'POST', form: data });
            await onSuccess?.(result);
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
            event?.persist();
            return send(event);
        },
        [send]
    );

    return { ...form, submit };
}
