import ky, { isHTTPError } from 'ky';

/** Error thrown for failed API responses. */
export class ApiError extends Error {
    status: number;
    url: string;

    constructor(message: string, status: number, url = '') {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.url = url;
    }
}

/** Configured HTTP client for API requests. */
export const api = ky.create({
    credentials: 'include',
    headers: { Accept: 'application/json' },
    retry: 0,
    hooks: {
        beforeError: [
            ({ request, error }) => {
                // Ky bounds error-body parsing by size and timeout before invoking this hook.
                request.signal.throwIfAborted();
                if (isHTTPError(error)) {
                    const payload: unknown = error.data;
                    const detail =
                        payload !== null && typeof payload === 'object' && 'detail' in payload ? payload.detail : null;
                    let message =
                        typeof detail === 'string' && detail.trim() !== ''
                            ? detail
                            : 'The server could not complete the request. Please try again.';

                    // Report validation locations and messages, never submitted values or error context.
                    if (error.response.status === 422 && Array.isArray(detail)) {
                        const messages = detail.slice(0, 5).flatMap((issue: unknown) => {
                            if (
                                issue === null ||
                                typeof issue !== 'object' ||
                                !('msg' in issue) ||
                                typeof issue.msg !== 'string'
                            )
                                return [];
                            const location =
                                'loc' in issue && Array.isArray(issue.loc)
                                    ? issue.loc
                                          .filter(
                                              (part: unknown) => typeof part === 'string' || typeof part === 'number'
                                          )
                                          .slice(1)
                                          .join('.')
                                    : '';
                            return [location ? `${location}: ${issue.msg}` : issue.msg];
                        });
                        if (messages.length > 0) message = messages.join('; ');
                    }

                    return new ApiError(message, error.response.status, request.url);
                }
                return error;
            },
        ],
    },
});
