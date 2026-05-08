import { resolveUrl } from '@/hooks/use-url';

/**
 * Resolves API base URL for current runtime mode.
 */
export const getApiBaseUrl = () => {
    return import.meta.env.MODE === 'sdk' ? '' : '/api';
};

type QueryValue = string | number | boolean | null | undefined;
export type ApiQueryParams = Record<string, QueryValue>;
type RequestCredentialsMode = 'omit' | 'same-origin' | 'include';

export type ApiRequestOptions<TBody = unknown> = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: TBody;
    query?: ApiQueryParams;
    appName?: string;
    credentials?: RequestCredentialsMode;
};

/**
 * Normalizes an API path for the current app scope.
 */
const normalizePath = (path: string, appName?: string) => {
    if (path.startsWith('/apps/')) {
        return path;
    }

    if (!appName) {
        return path;
    }

    const normalizedAppName = appName.replace(/^\/+|\/+$/g, '');
    const normalizedPath = path.replace(/^\/+|\/+$/g, '');

    if (normalizedPath.length === 0) {
        return `/apps/${normalizedAppName}`;
    }

    return `/apps/${normalizedAppName}/${normalizedPath}`;
};

/**
 * Resolves an API path for the current runtime.
 */
const resolveApiUrl = (path: string, appName?: string) => resolveUrl(getApiBaseUrl(), normalizePath(path, appName));

/**
 * Converts an API failure payload into a readable error message.
 */
const toApiErrorMessage = (status: number, responseData: unknown) => {
    const defaultMessage = `API request failed (${status})`;

    if (typeof responseData === 'string' && responseData.trim().length > 0) {
        return responseData;
    }

    if (responseData && typeof responseData === 'object') {
        const typedData = responseData as { detail?: string; message?: string };
        return typedData.detail ?? typedData.message ?? defaultMessage;
    }

    return defaultMessage;
};

/**
 * Builds a request URL with optional query parameters.
 */
const buildUrl = (path: string, query?: ApiQueryParams) => {
    const baseUrl = resolveApiUrl(path);
    if (!query) return baseUrl;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value != null) {
            params.set(key, String(value));
        }
    }
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Makes an API request to backend with automatic JSON handling.
 * Supports query parameters, custom body types, app-scoped paths.
 * Throws Error with response message on failure.
 */
export async function apiFetch<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
    const { method, query, body, credentials } = options;

    const url = buildUrl(path, query);
    const headers: Record<string, string> = { Accept: 'application/json' };

    const isRawBody =
        body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob || typeof body === 'string';

    if (!isRawBody && body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const fetchOptions: RequestInit = {
        method: method || (body !== undefined ? 'POST' : undefined),
        credentials: credentials === 'include' ? 'include' : 'same-origin',
        headers,
        ...(body !== undefined && { body: isRawBody ? body : JSON.stringify(body) }),
    };

    const response = await fetch(url, fetchOptions);

    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as TResponse;
    }

    const text = await response.text();
    if (text.length === 0) {
        return undefined as TResponse;
    }

    if (!response.ok) {
        let data: unknown;
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
        throw new Error(toApiErrorMessage(response.status, data));
    }

    return response.headers.get('content-type')?.includes('application/json')
        ? (JSON.parse(text) as TResponse)
        : (text as unknown as TResponse);
}
