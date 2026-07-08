const URL_VALIDATION_BASE = 'http://longlink.local';

/** Normalizes a same-origin browser path or returns null for unsafe values. */
export function normalizeSameOriginPath(value: string): string | null {
    if (!value.startsWith('/') || value.includes('\\')) {
        return null;
    }

    try {
        const base = new URL(URL_VALIDATION_BASE);
        const url = new URL(value, base);

        if (url.origin !== base.origin) {
            return null;
        }

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
}
