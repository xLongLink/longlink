const DEFAULT_API_URL = '';

type ApiErrorPayload = {
    detail?: string;
} | null;

/** Error thrown for failed API responses. */
export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}


/** Builds the canonical React Query key for one API resource. */
export function apiQueryKey(path: string): [string, string] {
    return ['api', apiUrl(path)];
}


/** Resolves an API path against the configured API origin. */
export function apiUrl(path: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

    if (!baseUrl) {
        return path;
    }

    return new URL(path, baseUrl).toString();
}


/** Reads the API error detail from a failed response. */
async function readApiError(response: Response): Promise<string> {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload;

    return payload?.detail ?? `API request failed (${response.status})`;
}


/** Sends one API request and normalizes non-OK errors. */
async function requestApi(path: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);

    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    const response = await fetch(apiUrl(path), {
        credentials: 'include',
        ...init,
        headers,
    });

    if (!response.ok) {
        throw new ApiError(await readApiError(response), response.status);
    }

    return response;
}


/** Fetches JSON and throws a normalized error for non-OK responses. */
export async function fetchApiJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await requestApi(path, init);

    return (await response.json()) as T;
}


/** Fetches text and throws a normalized error for non-OK responses. */
export async function fetchApiText(path: string, init?: RequestInit): Promise<string> {
    const response = await requestApi(path, init);

    return response.text();
}


/** Fetches an API endpoint and ignores the body on success. */
export async function fetchApiVoid(path: string, init?: RequestInit): Promise<void> {
    await requestApi(path, init);
}
