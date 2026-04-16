const apiBaseUrl = '/api';

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

export const getApiBaseUrl = () => normalizeBaseUrl(apiBaseUrl);

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

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

const normalizePath = (path: string, appName?: string) => {
    if (path.startsWith('/apps/')) {
        return path;
    }

    if (!appName) {
        return path;
    }

    const normalizedAppName = trimSlashes(appName);
    const normalizedPath = trimSlashes(path);

    if (normalizedPath.length === 0) {
        return `/apps/${normalizedAppName}`;
    }

    return `/apps/${normalizedAppName}/${normalizedPath}`;
};

const buildApiUrl = (path: string, appName?: string) => `${getApiBaseUrl()}${normalizePath(path, appName)}`;

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

const buildUrl = (path: string, query?: ApiQueryParams) => {
    const url = new URL(buildApiUrl(path), window.location.origin);
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value != null) {
                url.searchParams.set(key, String(value));
            }
        }
    }
    return url.toString().replace(window.location.origin, '');
};

/**
 * Makes an API request to the backend with automatic JSON handling.
 * Supports query parameters, custom body types, and app-scoped paths.
 * Throws an Error with the response message on failure.
 */
export async function apiFetch<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
    const { method, query, body, credentials } = options;
    const withCredentials = credentials === 'include';

    const url = buildUrl(path, query);

    const headers: Record<string, string> = {
        Accept: 'application/json',
    };

    let fetchOptions: RequestInit = {
        credentials: withCredentials ? 'include' : 'same-origin',
    };

    if (body !== undefined) {
        if (
            body instanceof FormData ||
            body instanceof URLSearchParams ||
            body instanceof Blob ||
            typeof body === 'string'
        ) {
            fetchOptions = { ...fetchOptions, method: method || 'POST', body };
        } else {
            headers['Content-Type'] = 'application/json';
            fetchOptions = { ...fetchOptions, method: method || 'POST', body: JSON.stringify(body) };
        }
    } else if (method) {
        fetchOptions.method = method;
    }

    fetchOptions.headers = headers;

    const response = await fetch(url, fetchOptions);

    if (response.status === 204) {
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

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        return JSON.parse(text) as TResponse;
    }

    return text as unknown as TResponse;
}

export const buildAppApiPath = (path: string, appName?: string) => buildApiUrl(path, appName);
