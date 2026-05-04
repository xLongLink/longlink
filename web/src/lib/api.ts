const controlPlaneApiBaseUrl = '/api';
const sdkDevApiBaseUrl = '/sdk-api';

/**
 * Removes trailing slashes from a base URL.
 */
const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

/**
 * Detects SDK runtime context.
 */
const isSdkRuntime = () => {
    if (import.meta.env.MODE === 'sdk') {
        return true;
    }

    if (!import.meta.env.DEV) {
        return false;
    }

    return false;
};

/**
 * Resolves API base URL for current runtime mode.
 */
export const getApiBaseUrl = () => {
    if (isSdkRuntime()) {
        return normalizeBaseUrl(import.meta.env.DEV ? sdkDevApiBaseUrl : '');
    }

    return normalizeBaseUrl(controlPlaneApiBaseUrl);
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
 * Trims slashes from both sides of a path segment.
 */
const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

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

    const normalizedAppName = trimSlashes(appName);
    const normalizedPath = trimSlashes(path);

    if (normalizedPath.length === 0) {
        return `/apps/${normalizedAppName}`;
    }

    return `/apps/${normalizedAppName}/${normalizedPath}`;
};

/**
 * Builds a fully qualified API path for the current runtime.
 */
const buildApiUrl = (path: string, appName?: string) => `${getApiBaseUrl()}${normalizePath(path, appName)}`;

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
 * Makes an API request to backend with automatic JSON handling.
 * Supports query parameters, custom body types, app-scoped paths.
 * Throws Error with response message on failure.
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
