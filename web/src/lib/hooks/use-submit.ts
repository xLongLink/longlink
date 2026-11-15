import { ApiErrorContext } from '@/lib/errors';
import { ReportedError } from '@/lib/reported';
import type { ViewData } from '@/views/protocol';
import { useCallback, useContext, useRef } from 'react';
import { FormRequestContext } from '@/components/custom/contexts';

type SubmitOptions = {
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    onSuccess?: (data: ViewData) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
};

export function useSubmit(path: string, options?: SubmitOptions): (data: FormData) => Promise<void>;
export function useSubmit<T>(
    action: (data: T) => void | Promise<void>,
    options?: Pick<SubmitOptions, 'onError'>
): (data: T) => Promise<void>;
/** Protects a write from duplicate activation without owning form state or validation. */
export function useSubmit<T>(action: string | ((data: T) => void | Promise<void>), options?: SubmitOptions) {
    const request = useContext(FormRequestContext);
    const reportError = useContext(ApiErrorContext);
    const pending = useRef<Promise<void> | null>(null);
    const method = options?.method ?? 'POST';
    const onSuccess = options?.onSuccess;
    const onError = options?.onError;

    // React Hook Form owns pending UI; the synchronous guard also covers rapid repeated submits.
    return useCallback(
        (data: T) => {
            if (pending.current) return pending.current;

            const submission = Promise.resolve().then(async () => {
                try {
                    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The submission boundary accepts a Platform callback or a scoped SDK path.
                    if (typeof action === 'function') {
                        await action(data);
                    } else {
                        if (!request) throw new Error('Scoped submissions require the Solution runtime');

                        if (!(data instanceof FormData)) throw new Error('Scoped submissions require FormData');

                        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method))
                            throw new Error('Unsupported write method');

                        const result = await request(action, { method, form: [...data.entries()] });
                        await onSuccess?.(result);
                    }
                } catch (cause) {
                    const error = cause instanceof Error ? cause : new Error('Submission failed', { cause });

                    if (!(error instanceof ReportedError)) reportError?.(error);

                    if (!onError) throw error;
                    await onError(error);
                } finally {
                    pending.current = null;
                }
            });

            pending.current = submission;

            return submission;
        },
        [action, method, onSuccess, onError, reportError, request]
    );
}
