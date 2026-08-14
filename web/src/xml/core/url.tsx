import { hasProtocol, parsePath, parseURL } from 'ufo';

const SAFE_ANCHOR_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const RELATIVE_URL_ORIGIN = 'http://longlink.local';

/** Resolves an app-relative URL against a base URL string. */
function resolveUrl(baseUrl: string, path: string): string {
    // Preserve the base URL for empty paths.
    if (!path) return baseUrl;

    const base = parseURL(baseUrl);
    const parsedPath = parsePath(path);
    const baseOrigin = base.protocol && base.host ? `${base.protocol}//${base.host}` : '';
    const baseSegments = base.pathname.split('/').filter(Boolean);
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

    // Block Windows separators and explicit protocols.
    if (value.includes('\\') || hasProtocol(value)) return false;

    // Use URL parsing to catch protocol-relative values without hand-rolled host checks.
    try {
        const base = new URL(RELATIVE_URL_ORIGIN);
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

    // Reject encoded separators and dot segments before browser URL normalization can escape the proxy prefix.
    const requestPath = value.split(/[?#]/, 1)[0];
    if (/(?:^|\/)(?=[^/]*%2e)(?:\.|%2e){1,2}(?=\/|$)|%2f|%5c/i.test(requestPath)) {
        throw new Error('XML request URL must remain within the application');
    }

    // Preserve app-relative leading slashes while resolving through the platform application proxy.
    const base = new URL(baseUrl, RELATIVE_URL_ORIGIN);
    const basePathname = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
    const url = new URL(value.replace(/^\/+/, ''), `${base.origin}${basePathname}`);

    // Require the normalized browser URL to retain the complete application proxy path.
    if (!url.pathname.startsWith(basePathname)) {
        throw new Error('XML request URL must remain within the application');
    }

    return base.origin === RELATIVE_URL_ORIGIN ? `${url.pathname}${url.search}${url.hash}` : url.toString();
}

/** Resolves an application navigation URL or omits invalid destinations. */
export function resolveNavigationUrl(baseUrl: string, path: string): string {
    return path && isAppRelativeUrl(path) ? resolveUrl(baseUrl, path) : '';
}

/** Resolves an XML anchor URL while blocking unsafe browser protocols. */
export function resolveAnchorUrl(baseUrl: string, path: string): string {
    const value = path.trim();

    // Drop empty, protocol-relative, and backslash-containing anchors.
    if (!value || value.startsWith('//') || value.includes('\\')) return '';

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
