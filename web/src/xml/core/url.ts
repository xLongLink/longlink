const SAFE_ANCHOR_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const RELATIVE_URL_ORIGIN = 'http://longlink.local';

/** Resolves an app-relative URL against a base URL string. */
function resolveUrl(baseUrl: string, path: string): string {
    const base = new URL(baseUrl, RELATIVE_URL_ORIGIN);
    const pathUrl = new URL(path, RELATIVE_URL_ORIGIN);
    const baseSegments = base.pathname.split('/').filter(Boolean);
    const pathEnd = path.search(/[?#]/);
    const pathSegments = (pathEnd === -1 ? path : path.slice(0, pathEnd)).split('/');
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

    return `${base.origin === RELATIVE_URL_ORIGIN ? '' : base.origin}/${resolvedSegments.join('/')}${pathUrl.search}${pathUrl.hash}`;
}

/** Returns whether a URL can be safely fetched relative to an application base URL. */
function isAppRelativeUrl(path: string): boolean {
    // Block Windows separators before URL parsing.
    if (path.includes('\\')) return false;

    // Use URL parsing to catch protocol-relative values without hand-rolled host checks.
    try {
        const url = new URL(path, RELATIVE_URL_ORIGIN);

        return url.origin === RELATIVE_URL_ORIGIN;
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
    if (/(?:^|\/)(?=[^/]*%2e)(?:\.|%2e){1,2}(?=\/|$)|%2f|%5c/i.test(value.split(/[?#]/, 1)[0])) {
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
    const value = path.trim();

    return value && isAppRelativeUrl(value) ? resolveUrl(baseUrl, path) : '';
}

/** Resolves an application destination with an optional browser-link fallback. */
export function resolveControlUrl(navigationBaseUrl: string, requestBaseUrl: string, to: string, href: string): string {
    return resolveNavigationUrl(navigationBaseUrl, to) || resolveAnchorUrl(requestBaseUrl, href);
}

/** Resolves an XML anchor URL while blocking unsafe browser protocols. */
export function resolveAnchorUrl(baseUrl: string, path: string): string {
    const value = path.trim();

    // Drop empty and backslash-containing anchors.
    if (!value || value.includes('\\')) return '';

    // Preserve allowed absolute browser links.
    try {
        const url = new URL(value);

        return SAFE_ANCHOR_PROTOCOLS.has(url.protocol) ? value : '';
    } catch {
        // Resolve only safe app-relative links.
        return isAppRelativeUrl(value) ? resolveUrl(baseUrl, value) : '';
    }
}
