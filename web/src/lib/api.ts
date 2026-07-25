import { hasProtocol } from 'ufo';

const DEFAULT_API_URL = '';

type ApiErrorPayload = {
    detail?:
        | string
        | {
              code?: string;
              reason?: string;
          };
} | null;

type ApiErrorResponse = {
    code?: string;
    message: string;
};

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
export function apiUrl(path: string): string {
    const baseUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

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
    if (!baseUrl) {
        return path;
    }

    return new URL(path, baseUrl).toString();
}

/** Reads the API error detail from a failed response. */
async function readApiError(response: Response): Promise<ApiErrorResponse> {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload;
    const fallback = `API request failed (${response.status})`;

    // Preserve simple API error codes as both the message and machine-readable code.
    if (typeof payload?.detail === 'string') {
        return { code: payload.detail, message: payload.detail };
    }

    // Prefer a validation reason while retaining its stable API error code.
    if (payload?.detail && typeof payload.detail === 'object') {
        const { code, reason } = payload.detail;

        return {
            code: typeof code === 'string' ? code : undefined,
            message: typeof reason === 'string' ? reason : typeof code === 'string' ? code : fallback,
        };
    }

    return { message: fallback };
}

/** Builds request headers shared by API and SDK XML action requests. */
export function createApiHeaders(initHeaders?: HeadersInit): Headers {
    return new Headers(initHeaders);
}

/** Sends one API request with shared URL, credential, and header handling. */
export async function fetchApiResponse(
    path: string,
    init?: RequestInit,
    fetchImpl: typeof fetch = fetch
): Promise<Response> {
    const headers = createApiHeaders(init?.headers);

    // Request JSON by default unless callers override Accept.
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

    // Convert failed responses into typed API errors.
    if (!response.ok) {
        const error = await readApiError(response);

        throw new ApiError(error.message, response.status, error.code);
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
