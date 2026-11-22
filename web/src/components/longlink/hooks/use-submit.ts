import { useContext } from 'react';
import * as submission from '@/lib/hooks/use-submit';
import type { ViewData } from '@/lib/view-capabilities';
import { RequestContext } from '@/lib/view-capabilities';

export type SubmitOptions = {
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    onSuccess?: (data: ViewData) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
};

/** Submits multipart writes through the Solution's scoped transport. */
export function useSubmit(path: string, options?: SubmitOptions): (data: FormData) => Promise<void> {
    const request = useContext(RequestContext)?.request;
    const method = options?.method ?? 'POST';

    return submission.useSubmit(async (data: FormData) => {
        if (!request) throw new Error('Scoped submissions require the Solution runtime');
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new Error('Unsupported write method');
        if (typeof path !== 'string') throw new Error('Scoped submissions require an endpoint path');
        if (!(data instanceof FormData)) throw new Error('Scoped submissions require FormData');

        const result = await request(path, { method, form: [...data.entries()] });
        await options?.onSuccess?.(result);
    }, options);
}
