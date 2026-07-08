import { getStoredSdkUserId } from '@/lib/sdk-users';
import { hasProtocol } from 'ufo';

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

    if (path.includes('\\')) {
        throw new Error('API path must not contain backslashes');
    }

    if (hasProtocol(path)) {
        const url = new URL(path);

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('API URL must use HTTP(S)');
        }

        return path;
    }

    if (path.startsWith('//')) {
        throw new Error('API path must be relative or absolute HTTP(S)');
    }

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

/** Builds request headers shared by API and SDK XML action requests. */
export function createApiHeaders(initHeaders?: HeadersInit): Headers {
    const headers = new Headers(initHeaders);

    if (import.meta.env.MODE === 'sdk' && !headers.has('x-user-id')) {
        headers.set('x-user-id', getStoredSdkUserId());
    }

    return headers;
}

/** Sends one API request with shared URL, credential, and header handling. */
export async function fetchApiResponse(
    path: string,
    init?: RequestInit,
    fetchImpl: typeof fetch = fetch
): Promise<Response> {
    const headers = createApiHeaders(init?.headers);

    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    return fetchImpl(apiUrl(path), {
        ...init,
        credentials: 'include',
        headers,
    });
}

/** Sends one API request and normalizes non-OK errors. */
async function requestApi(path: string, init?: RequestInit): Promise<Response> {
    const response = await fetchApiResponse(path, init);

    if (!response.ok) {
        throw new ApiError(await readApiError(response), response.status);
    }

    return response;
}

/** Fetches JSON and optionally validates it before returning typed data. */
export async function fetchApiJson<T>(path: string, init?: RequestInit, parse?: (value: unknown) => T): Promise<T> {
    const response = await requestApi(path, init);
    const value = (await response.json()) as unknown;

    return parse ? parse(value) : (value as T);
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
