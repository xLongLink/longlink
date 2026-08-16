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
                    const payload: { detail?: unknown } | null = await response
                        .clone()
                        .json()
                        .catch(() => null);
                    const detail = payload?.detail;
                    const message = typeof detail === 'string' ? detail : `API request failed (${response.status})`;

                    throw new ApiError(message, response.status);
                }
            },
        ],
    },
});
