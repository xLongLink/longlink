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
                    const message =
                        typeof detail === 'string' && detail.trim() !== ''
                            ? detail
                            : 'The server could not complete the request. Please try again.';

                    return new ApiError(message, error.response.status, request.url);
                }
                return error;
            },
        ],
    },
});
