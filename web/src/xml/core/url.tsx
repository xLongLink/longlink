import { createContext as createReactContext, useContext as useReactContext } from 'react';

export const BaseUrlContext = createReactContext<string>('');

/** Resolves a request URL against a base URL string. */
export function resolveUrl(baseUrl: string, path: string): string {
    if (!path) return baseUrl;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (!baseUrl) return path;

    return `${baseUrl}${path}`;
}

/** Resolves a request URL against the active base URL. */
export function useUrl(path: string): string {
    const baseUrl = useReactContext(BaseUrlContext);

    return resolveUrl(baseUrl, path);
}
