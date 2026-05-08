import { createContext, useContext } from 'react';

export const BaseUrlContext = createContext<string>('');

/** Resolves a path against a base URL. */
export function resolveUrl(baseUrl: string, path: string): string {
    if (!path) {
        return baseUrl;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    if (!baseUrl) {
        return path;
    }

    return `${baseUrl}${path}`;
}

/** Resolves a path against the active base URL. */
export function useUrl(path: string): string {
    const baseUrl = useContext(BaseUrlContext);

    return resolveUrl(baseUrl, path);
}
