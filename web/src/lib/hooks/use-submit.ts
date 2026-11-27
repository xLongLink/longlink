import { ApiErrorContext } from '@/lib/errors';
import { ReportedError } from '@/lib/reported';
import { useCallback, useContext } from 'react';
import { useSingleFlight } from '@/lib/hooks/use-single-flight';

export type SubmitOptions = { onError?: (error: Error) => void | Promise<void> };

/** Protects a callback from duplicate activation until its work and error handling finish. */
export function useSubmit<T>(
    action: (data: T) => void | Promise<void>,
    options?: SubmitOptions
): (data: T) => Promise<void> {
    const reportError = useContext(ApiErrorContext);
    const onError = options?.onError;

    const submit = useCallback(
        async (data: T) => {
            try {
                await action(data);
            } catch (cause) {
                const error = cause instanceof Error ? cause : new Error('Submission failed', { cause });

                if (!(error instanceof ReportedError)) reportError?.(error);

                if (!onError) throw error;
                await onError(error);
            }
        },
        [action, onError, reportError]
    );

    return useSingleFlight(submit);
}
