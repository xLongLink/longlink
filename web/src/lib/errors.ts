import { ApiError } from '@/lib/api';
import { createContext, useContext } from 'react';
import { isNetworkError, isTimeoutError } from 'ky';
import { isCancelledError } from '@tanstack/react-query';

export type ErrorReporter = (error: unknown) => void;
export const ApiErrorContext = createContext<ErrorReporter | null>(null);

/** Returns the root-owned reporter for requests outside TanStack Query. */
export function useApiError(): ErrorReporter {
    const reportError = useContext(ApiErrorContext);
    if (reportError === null) throw new Error('API error reporting requires RootProvider');
    return reportError;
}

/** Ignores canceled work without hiding timeouts or other transport failures. */
export function isCanceledRequest(error: unknown): boolean {
    return isCancelledError(error) || (error instanceof Error && error.name === 'AbortError');
}

/** Creates isolated notification deduplication for one application root. */
export function createErrorReporter(notify: (message: string) => void): ErrorReporter {
    const reported = new WeakSet<object>();
    let lastMessage = '';
    let lastReportedAt = 0;

    return (error) => {
        // The same failure may cross both request and workflow boundaries.
        if (isCanceledRequest(error)) return;
        if (error !== null && typeof error === 'object') {
            if (reported.has(error)) return;
            reported.add(error);
        }

        // Only backend-authored messages are suitable for direct display.
        const message =
            error instanceof ApiError
                ? error.message
                : isTimeoutError(error)
                  ? 'The request timed out. Please try again.'
                  : isNetworkError(error)
                    ? 'Unable to reach the server. Please try again.'
                    : 'The request could not be completed. Please try again.';
        const now = Date.now();
        if (message === lastMessage && now - lastReportedAt < 5000) return;
        lastMessage = message;
        lastReportedAt = now;
        notify(message);
    };
}
