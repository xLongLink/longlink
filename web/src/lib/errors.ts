import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { isObjectLike } from 'es-toolkit/compat';
import { createContext, useContext } from 'react';
import { isNetworkError, isTimeoutError } from 'ky';
import { isCancelledError } from '@tanstack/react-query';

type ErrorReporter = (cause: unknown) => void;

export const ApiErrorContext = createContext<ErrorReporter | null>(null);

/** Returns the root-owned reporter for requests outside TanStack Query. */
export function useApiError(): ErrorReporter {
    const reportError = useContext(ApiErrorContext);

    if (reportError === null) throw new Error('API error reporting requires Root');

    return reportError;
}

/** Ignores canceled work without hiding timeouts or other transport failures. */
export function isCanceledRequest(cause: unknown): boolean {
    return isCancelledError(cause) || (cause instanceof Error && cause.name === 'AbortError');
}

/** Creates isolated notification deduplication for one application root. */
export function createErrorReporter(notify: (message: string) => void): ErrorReporter {
    const reported = new WeakSet<object>();
    let lastMessage = '';
    let lastReportedAt = 0;

    return (cause) => {
        // The same failure may cross both request and workflow boundaries.
        if (isCanceledRequest(cause)) return;

        // Object identity is useful even when a transport throws something other than an Error.
        const failure = z.custom<object>(isObjectLike).safeParse(cause);

        if (failure.success) {
            if (reported.has(failure.data)) return;
            reported.add(failure.data);
        }

        // Only backend-authored messages are suitable for direct display.
        const message =
            cause instanceof ApiError
                ? cause.message
                : isTimeoutError(cause)
                  ? 'The request timed out. Please try again.'
                  : isNetworkError(cause)
                    ? 'Unable to reach the server. Please try again.'
                    : 'The request could not be completed. Please try again.';

        const now = Date.now();

        if (message === lastMessage && now - lastReportedAt < 5000) return;
        lastMessage = message;
        lastReportedAt = now;
        notify(message);
    };
}
