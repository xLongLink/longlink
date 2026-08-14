import { hasProtocol } from 'ufo';

type ApiErrorPayload = {
    detail?: string;
} | null;

const apiBaseUrl = import.meta.env.VITE_API_URL || '';

/** Error thrown for failed API responses. */
export class ApiError extends Error {
    code?: string;
    status: number;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
    }
}

/** Builds the canonical React Query key for one API resource. */
export function apiQueryKey(path: string): [string, string] {
    return ['api', apiUrl(path)];
}

/** Resolves an API path against the configured API origin. */
function apiUrl(path: string): string {
    // Reject path separators that could bypass URL checks.
    if (path.includes('\\')) {
        throw new Error('API path must not contain backslashes');
    }

    // Validate absolute API URLs before using them.
    if (hasProtocol(path)) {
        const url = new URL(path);

        // Only browser HTTP(S) URLs are allowed.
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('API URL must use HTTP(S)');
        }

        return path;
    }

    // Reject protocol-relative URLs.
    if (path.startsWith('//')) {
        throw new Error('API path must be relative or absolute HTTP(S)');
    }

    // Keep relative paths unchanged when no API origin is configured.
    if (!apiBaseUrl) {
        return path;
    }

    return new URL(path, apiBaseUrl).toString();
}

/** Reads the API error detail from a failed response. */
async function readApiError(response: Response) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload;
    const fallback = `API request failed (${response.status})`;

    // Preserve simple API error codes as both the message and machine-readable code.
    if (typeof payload?.detail === 'string') {
        return { code: payload.detail, message: payload.detail };
    }

    return { message: fallback };
}

/** Sends one API request and normalizes non-OK errors. */
export async function requestApi(path: string, init?: RequestInit, fetchImpl: typeof fetch = fetch): Promise<Response> {
    const headers = new Headers(init?.headers);

    // Request JSON by default unless callers override Accept.
    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    const response = await fetchImpl(apiUrl(path), {
        ...init,
        credentials: 'include',
        headers,
    });

    // Convert failed responses into typed API errors.
    if (!response.ok) {
        const error = await readApiError(response);

        throw new ApiError(error.message, response.status, error.code);
    }

    return response;
}

/** Fetches unvalidated JSON. */
export async function fetchApiJson(path: string, init?: RequestInit): Promise<unknown> {
    const response = await requestApi(path, init);

    return response.json() as Promise<unknown>;
}
