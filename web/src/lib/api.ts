import ky from 'ky';

/** Error thrown for failed API responses. */
export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/** Configured HTTP client for API requests. */
export const api = ky.create({
    credentials: 'include',
    headers: { Accept: 'application/json' },
    retry: 0,
    hooks: {
        afterResponse: [
            async ({ response }) => {
                // Normalize failed responses without consuming the response body.
                if (!response.ok) {
                    const payload = (await response
                        .clone()
                        .json()
                        .catch(() => null)) as { detail?: unknown } | null;
                    const message =
                        typeof payload?.detail === 'string'
                            ? payload.detail
                            : `API request failed (${response.status})`;

                    throw new ApiError(message, response.status);
                }
            },
        ],
    },
});
