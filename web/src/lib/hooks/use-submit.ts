import { ApiErrorContext } from '@/lib/errors';
import { ReportedError } from '@/lib/reported';
import { useCallback, useContext, useRef } from 'react';

export type SubmitOptions = { onError?: (error: Error) => void | Promise<void> };

/** Protects a callback from duplicate activation until its work and error handling finish. */
export function useSubmit<T>(
    action: (data: T) => void | Promise<void>,
    options?: SubmitOptions
): (data: T) => Promise<void> {
    const reportError = useContext(ApiErrorContext);
    const pending = useRef<Promise<void> | null>(null);
    const onError = options?.onError;

    // React Hook Form owns pending UI; the synchronous guard also covers rapid repeated submits.
    return useCallback(
        (data: T) => {
            if (pending.current) return pending.current;

            const submission = Promise.resolve().then(async () => {
                try {
                    await action(data);
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
        [action, onError, reportError]
    );
}
