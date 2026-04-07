import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

const isSdkMode = import.meta.env.MODE === 'sdk';

const defaultApiBaseUrl = isSdkMode ? 'http://localhost:1707' : 'http://localhost:8000';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.toString() ?? defaultApiBaseUrl;

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

export const getApiBaseUrl = () => normalizeBaseUrl(apiBaseUrl);

type QueryValue = string | number | boolean | null | undefined;
export type ApiQueryParams = Record<string, QueryValue>;
type RequestCredentialsMode = 'omit' | 'same-origin' | 'include';

export type ApiRequestOptions<TBody = unknown> = Omit<
    AxiosRequestConfig<TBody>,
    'baseURL' | 'params' | 'url' | 'data'
> & {
    body?: TBody;
    query?: ApiQueryParams;
    appName?: string;
    credentials?: RequestCredentialsMode;
};

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

const normalizeAppPathForSdk = (path: string) => {
    const sdkPathMatch = path.match(/^\/apps\/[^/]+\/(.+)$/);

    if (!sdkPathMatch) {
        return path;
    }

    const sdkRelativePath = trimSlashes(sdkPathMatch[1] ?? '');
    return sdkRelativePath.length > 0 ? `/${sdkRelativePath}` : '/';
};

const normalizePath = (path: string, appName?: string) => {
    if (isSdkMode) {
        return normalizeAppPathForSdk(path);
    }

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

const toApiErrorMessage = (error: AxiosError) => {
    const status = error.response?.status;
    const defaultMessage = `API request failed (${status ?? 'unknown'})`;
    const responseData = error.response?.data;

    if (typeof responseData === 'string' && responseData.trim().length > 0) {
        return responseData;
    }

    if (responseData && typeof responseData === 'object') {
        const typedData = responseData as { detail?: string; message?: string };
        return typedData.detail ?? typedData.message ?? defaultMessage;
    }

    return defaultMessage;
};

export async function apiFetch<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
    const { query, body, appName, credentials, ...config } = options;
    const withCredentials = credentials === 'include';

    try {
        const response = await axios.request<string>({
            baseURL: getApiBaseUrl(),
            url: normalizePath(path, appName),
            params: query,
            data: body,
            withCredentials,
            responseType: 'text',
            headers: {
                Accept: 'application/json',
                ...config.headers,
            },
            ...config,
        });

        if (response.status === 204 || response.data.length === 0) {
            return undefined as TResponse;
        }

        const contentType = response.headers['content-type'];
        if (contentType?.includes('application/json')) {
            return JSON.parse(response.data) as TResponse;
        }

        return response.data as TResponse;
    } catch (error) {
        if (error instanceof AxiosError) {
            throw new Error(toApiErrorMessage(error));
        }

        throw error;
    }
}

export const buildAppApiPath = (path: string, appName?: string) => buildApiUrl(path, appName);
