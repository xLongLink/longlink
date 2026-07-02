const REDIRECT_VALIDATION_BASE = 'http://longlink.local';


/** Sanitizes login redirect targets to same-origin relative paths. */
export function sanitizeRedirectPath(value: string | null | undefined, fallback = '/organizations'): string {
    const candidate = value?.trim() ?? '';

    if (!candidate.startsWith('/') || candidate.includes('\\')) {
        return fallback;
    }

    // Let the URL parser normalize same-origin paths and reject protocol-relative redirects.
    try {
        const base = new URL(REDIRECT_VALIDATION_BASE);
        const url = new URL(candidate, base);

        if (url.origin !== base.origin) {
            return fallback;
        }

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return fallback;
    }
}
