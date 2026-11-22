import type { z } from 'zod';
import type { FormEvent } from 'react';
import * as forms from 'react-hook-form';
import { useContext, useRef } from 'react';
import { ApiErrorContext } from '@/lib/errors';
import { ReportedError } from '@/lib/reported';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ViewData } from '@/lib/view-capabilities';
import { RequestContext } from '@/lib/view-capabilities';

export type FormOptions<T extends forms.FieldValues = forms.FieldValues, U extends forms.FieldValues = T> = {
    schema?: z.ZodType<U, T>;
    defaultValues?: forms.DefaultValues<T>;
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    onSuccess?: (data: ViewData) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
};

function formValues(data: FormData): forms.FieldValues {
    const values = Object.create(null) as Record<string, unknown>;
    for (const key of new Set(data.keys())) {
        const entries = data.getAll(key);
        values[key] = entries.length === 1 ? entries[0] : entries;
    }
    return values;
}

function encodeValues(values: unknown): FormData {
    if (values instanceof FormData) return values;
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
        throw new Error('Form values must be an object');
    }
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) {
        for (const entry of Array.isArray(value) ? value : [value]) {
            if (entry === null || entry === undefined) continue;
            if (entry instanceof Blob) data.append(key, entry);
            else if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
                data.append(key, String(entry));
            } else {
                throw new Error(`Unsupported form value for "${key}": expected a primitive or file`);
            }
        }
    }
    return data;
}

/**
 * Validates and submits scoped multipart writes without resetting field drafts.
 * Invalid values populate field errors and reject; submission failures reject unless onError handles them.
 */
export function useForm<T extends forms.FieldValues = forms.FieldValues, U extends forms.FieldValues = T>(
    path: string,
    options?: FormOptions<T, U>
): forms.UseFormReturn<T, unknown, U> & {
    submit: (data?: T | FormData) => Promise<void>;
    onSubmit: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
} {
    const request = useContext(RequestContext)?.request;
    const reportError = useContext(ApiErrorContext);
    const pending = useRef<Promise<void> | null>(null);
    const supplied = useRef<T | FormData | undefined>(undefined);
    const schema = options?.schema;
    const resolver: forms.Resolver<T, unknown, U> = async (values, context, resolverOptions) => {
        try {
            const input =
                supplied.current instanceof FormData
                    ? (formValues(supplied.current) as T)
                    : (supplied.current ?? values);
            if (!schema) return { values: input as unknown as U, errors: {} };
            return await zodResolver(schema)(input, context, resolverOptions);
        } catch (cause) {
            const error = await fail(cause);
            return {
                values: {},
                errors: { root: { type: 'submission', message: error.message } } as forms.FieldErrors<T>
            };
        }
    };
    const form = forms.useForm<T, unknown, U>({ defaultValues: options?.defaultValues, resolver });

    const fail = async (cause: unknown): Promise<Error> => {
        const error = cause instanceof Error ? cause : new Error('Submission failed', { cause });
        form.setError('root', { type: 'submission', message: error.message });
        if (!(error instanceof ReportedError)) reportError?.(error);
        if (!options?.onError) throw error;
        await options.onError(error);
        return error;
    };

    const send = async (values: U): Promise<void> => {
        try {
            const method = options?.method ?? 'POST';
            if (!request) throw new Error('Scoped submissions require the Solution runtime');
            if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new Error('Unsupported write method');
            if (typeof path !== 'string') throw new Error('Scoped submissions require an endpoint path');
            const data = encodeValues(!schema && supplied.current instanceof FormData ? supplied.current : values);
            const result = await request(path, { method, form: [...data.entries()] });
            await options?.onSuccess?.(result);
        } catch (cause) {
            await fail(cause);
        }
    };

    const submit = (data?: T | FormData): Promise<void> => {
        if (pending.current) return pending.current;
        supplied.current = data;
        const operation = Promise.resolve().then(async () => {
            try {
                let invalid = false;
                await form.handleSubmit(send, (errors) => {
                    invalid = errors.root?.type !== 'submission';
                })();
                if (invalid) throw new Error('Form validation failed');
            } finally {
                supplied.current = undefined;
                pending.current = null;
            }
        });
        pending.current = operation;
        return operation;
    };

    const onSubmit = async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
        event?.preventDefault();
        event?.stopPropagation();
        try {
            await submit();
        } catch {
            // Form events surface failures through root errors and the contextual reporter.
        }
    };

    return { ...form, onSubmit, submit };
}
