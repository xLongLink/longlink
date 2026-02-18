const defaultApiBaseUrl = 'http://localhost:8000';

const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL?.toString() ?? defaultApiBaseUrl;

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

export const getApiBaseUrl = () => normalizeBaseUrl(apiBaseUrl);

type QueryValue = string | number | boolean | null | undefined;
export type ApiQueryParams = Record<string, QueryValue>;

export type ApiRequestOptions<TBody = unknown> = Omit<RequestInit, 'body'> & {
    body?: TBody;
    query?: ApiQueryParams;
};

const buildApiUrl = (path: string, query?: ApiQueryParams) => {
    const url = new URL(path, getApiBaseUrl());

    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            url.searchParams.set(key, String(value));
        });
    }

    return url.toString();
};

const isJsonBody = (body: unknown): body is Record<string, unknown> => {
    if (body === null || body === undefined) return false;
    if (typeof body === 'string') return false;
    if (body instanceof FormData) return false;
    if (body instanceof URLSearchParams) return false;
    if (body instanceof Blob) return false;
    if (body instanceof ArrayBuffer) return false;
    return typeof body === 'object';
};

export async function apiFetch<TResponse>(
    path: string,
    options: ApiRequestOptions = {}
): Promise<TResponse> {
    const { query, headers, body, ...init } = options;
    const requestHeaders = new Headers(headers);

    if (!requestHeaders.has('Accept')) {
        requestHeaders.set('Accept', 'application/json');
    }

    let requestBody: BodyInit | undefined = body as BodyInit | undefined;

    if (isJsonBody(body)) {
        requestHeaders.set('Content-Type', 'application/json');
        requestBody = JSON.stringify(body);
    }

    const response = await fetch(buildApiUrl(path, query), {
        ...init,
        headers: requestHeaders,
        body: requestBody,
    });

    if (!response.ok) {
        let message = `API request failed (${response.status})`;

        try {
            const errorBody = (await response.json()) as {
                detail?: string;
                message?: string;
            };
            message = errorBody.detail ?? errorBody.message ?? message;
        } catch {
            // Ignore JSON parse errors and keep the default message.
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return undefined as TResponse;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        return (await response.json()) as TResponse;
    }

    return (await response.text()) as TResponse;
}
