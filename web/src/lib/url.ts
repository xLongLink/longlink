const RELATIVE_URL_ORIGIN = 'http://longlink.local';

/** Resolves a solution-relative URL against a base URL string. */
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

/** Returns whether a URL can be safely fetched relative to a solution base URL. */
function isSolutionRelativeUrl(path: string): boolean {
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

/** Resolves a Solution request URL while blocking cross-origin and protocol URLs. */
export function resolveRequestUrl(baseUrl: string, path: string): string {
    const value = path.trim();

    // Reject requests that would leave the solution origin.
    if (!isSolutionRelativeUrl(value)) {
        throw new Error('Solution request URL must be solution-relative');
    }

    // Reject encoded separators and dot segments before browser URL normalization can escape the proxy prefix.
    if (/(?:^|\/)(?=[^/]*%2e)(?:\.|%2e){1,2}(?=\/|$)|%2f|%5c/i.test(value.split(/[?#]/, 1)[0])) {
        throw new Error('Solution request URL must remain within the solution');
    }

    // Preserve solution-relative leading slashes while resolving through the platform solution proxy.
    const base = new URL(baseUrl, RELATIVE_URL_ORIGIN);
    const basePathname = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
    const url = new URL(value.replace(/^\/+/, ''), `${base.origin}${basePathname}`);

    // Require the normalized browser URL to retain the complete solution proxy path.
    if (!url.pathname.startsWith(basePathname)) {
        throw new Error('Solution request URL must remain within the solution');
    }

    return base.origin === RELATIVE_URL_ORIGIN ? `${url.pathname}${url.search}${url.hash}` : url.toString();
}

/** Resolves a solution navigation URL or omits invalid destinations. */
export function resolveNavigationUrl(baseUrl: string, path: string): string {
    const value = path.trim();

    return value && isSolutionRelativeUrl(value) ? resolveUrl(baseUrl, path) : '';
}
