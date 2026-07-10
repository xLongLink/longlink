import { createContext as createReactContext, useContext as useReactContext } from 'react';
import { hasProtocol, parsePath, parseURL } from 'ufo';

export const BaseUrlContext = createReactContext<string>('');
const SAFE_ANCHOR_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const URL_VALIDATION_BASE = 'http://longlink.local';

/** Resolves a request URL against a base URL string. */
export function resolveUrl(baseUrl: string, path: string): string {
    // Preserve the base URL for empty paths.
    if (!path) return baseUrl;

    // Keep already absolute or protocol-relative paths unchanged.
    if (hasProtocol(path) || path.startsWith('//')) return path;

    const base = parseURL(baseUrl);
    const parsedPath = parsePath(path);
    const baseOrigin = base.protocol && base.host ? `${base.protocol}//${base.host}` : '';
    const basePath = base.pathname;
    const baseSegments = basePath.split('/').filter(Boolean);
    const pathSegments = parsedPath.pathname.split('/');
    const resolvedSegments = [...baseSegments];

    // Apply relative path segments on top of the base path.
    for (const segment of pathSegments) {
        // Ignore empty and current-directory segments.
        if (!segment || segment === '.') continue;

        // Resolve parent-directory segments without escaping the base.
        if (segment === '..') {
            // Only pop segments added by the relative path.
            if (resolvedSegments.length > baseSegments.length) {
                resolvedSegments.pop();
            }
            continue;
        }

        resolvedSegments.push(segment);
    }

    return `${baseOrigin}/${resolvedSegments.join('/')}${parsedPath.search}${parsedPath.hash}`;
}

/** Returns whether a URL can be safely fetched relative to an application base URL. */
export function isAppRelativeUrl(path: string): boolean {
    const value = path.trim();

    // Empty paths are safe app-relative requests.
    if (!value) return true;

    // Block Windows separators and explicit protocols.
    if (value.includes('\\') || hasProtocol(value)) return false;

    // Use URL parsing to catch protocol-relative values without hand-rolled host checks.
    try {
        const base = new URL(URL_VALIDATION_BASE);
        const url = new URL(value, base);

        return url.origin === base.origin;
    } catch {
        return false;
    }
}

/** Resolves an XML request URL while blocking cross-origin and protocol URLs. */
export function resolveRequestUrl(baseUrl: string, path: string): string {
    const value = path.trim();

    // Reject requests that would leave the application origin.
    if (!isAppRelativeUrl(value)) {
        throw new Error('XML request URL must be app-relative');
    }

    return resolveUrl(baseUrl, value);
}

/** Resolves an XML anchor URL while blocking unsafe browser protocols. */
export function resolveAnchorUrl(baseUrl: string, path: string): string {
    const value = path.trim();

    // Drop empty and protocol-relative anchors.
    if (!value || value.startsWith('//')) return '';

    // Validate absolute browser links before returning them.
    if (hasProtocol(value)) {
        // Parse protocols using the platform URL implementation.
        try {
            const url = new URL(value);

            return SAFE_ANCHOR_PROTOCOLS.has(url.protocol) ? value : '';
        } catch {
            return '';
        }
    }

    // Drop relative anchors that resolve outside the app.
    if (!isAppRelativeUrl(value)) return '';

    return resolveUrl(baseUrl, value);
}

/** Resolves a request URL against the active base URL. */
export function useUrl(path: string): string {
    const baseUrl = useReactContext(BaseUrlContext);

    return resolveUrl(baseUrl, path);
}

/** Resolves an anchor URL against the active base URL. */
export function useAnchorUrl(path: string): string {
    const baseUrl = useReactContext(BaseUrlContext);

    return resolveAnchorUrl(baseUrl, path);
}
