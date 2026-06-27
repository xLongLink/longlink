import { createContext as createReactContext, useContext as useReactContext } from 'react';

export const BaseUrlContext = createReactContext<string>('');

/** Resolves a request URL against a base URL string. */
export function resolveUrl(baseUrl: string, path: string): string {
    if (!path) return baseUrl;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    const [pathPart, suffix = ''] = path.split(/([?#].*)/, 2);
    const basePart = baseUrl.split(/[?#]/, 1)[0];
    const baseSegments = basePart.split('/').filter(Boolean);
    const pathSegments = pathPart.split('/');
    const resolvedSegments = [...baseSegments];

    for (const segment of pathSegments) {
        if (!segment || segment === '.') continue;

        if (segment === '..') {
            if (resolvedSegments.length > baseSegments.length) {
                resolvedSegments.pop();
            }
            continue;
        }

        resolvedSegments.push(segment);
    }

    return `/${resolvedSegments.join('/')}${suffix}`;
}

/** Resolves a request URL against the active base URL. */
export function useUrl(path: string): string {
    const baseUrl = useReactContext(BaseUrlContext);

    return resolveUrl(baseUrl, path);
}
