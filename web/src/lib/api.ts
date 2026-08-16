export type ApiQueryKey = readonly ['api', string];

/** Error thrown for failed API responses. */
export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/** Sends one API request and normalizes non-OK errors. */
export async function requestApi(path: string, init?: RequestInit, fetchImpl: typeof fetch = fetch): Promise<Response> {
    const headers = new Headers(init?.headers);

    // Request JSON by default unless callers override Accept.
    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    const response = await fetchImpl(path, {
        ...init,
        credentials: 'include',
        headers,
    });

    // Convert failed responses into typed API errors.
    if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
        const message =
            typeof payload?.detail === 'string' ? payload.detail : `API request failed (${response.status})`;

        throw new ApiError(message, response.status);
    }

    return response;
}

/** Sends one JSON API request. */
export function requestApiJson(path: string, body: unknown, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');

    return requestApi(path, { ...init, body: JSON.stringify(body), headers });
}

/** Fetches unvalidated JSON. */
export async function fetchApiJson(path: string, init?: RequestInit): Promise<unknown> {
    const response = await requestApi(path, init);

    return response.json() as Promise<unknown>;
}
