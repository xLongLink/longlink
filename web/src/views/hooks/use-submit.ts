import { useCallback, useContext } from 'react';
import { RequestContext } from '@/views/contexts';
import * as submission from '@/lib/hooks/use-submit';
import type { ViewData, RequestOptions } from '../protocol';

export type SubmitOptions = {
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    onSuccess?: (data: ViewData) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
};

/** Shares scoped transport checks without owning validation or error reporting. */
export function useScopedWrite(options?: Pick<SubmitOptions, 'method' | 'onSuccess'>) {
    const request = useContext(RequestContext)?.request;
    const method = options?.method ?? 'POST';
    const onSuccess = options?.onSuccess;

    return useCallback(
        async (path: string, form: NonNullable<RequestOptions['form']>) => {
            if (!request) throw new Error('Scoped submissions require the Solution runtime');
            if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new Error('Unsupported write method');

            const result = await request(path, { method, form });
            await onSuccess?.(result);
        },
        [request, method, onSuccess]
    );
}

export function useSubmit(path: string, options?: SubmitOptions): (data: FormData) => Promise<void>;
export function useSubmit<T>(
    action: (data: T) => void | Promise<void>,
    options?: Pick<SubmitOptions, 'onError'>
): (data: T) => Promise<void>;
/** Submits scoped multipart writes or guarded callbacks without owning form state. */
export function useSubmit<T>(action: string | ((data: T) => void | Promise<void>), options?: SubmitOptions) {
    const write = useScopedWrite(options);

    return submission.useSubmit(async (data: T) => {
        if (typeof action === 'function') {
            await action(data);
            return;
        }

        if (!(data instanceof FormData)) throw new Error('Scoped submissions require FormData');
        await write(action, [...data.entries()]);
    }, options);
}
