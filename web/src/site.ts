export const siteName = 'LongLink';

/** Validates and normalizes the configured public site origin. */
function siteOrigin(value = 'https://www.longlink.dev'): string {
    const url = new URL(value);

    if (
        (url.protocol !== 'http:' && url.protocol !== 'https:') ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
    ) {
        throw new Error('VITE_SITE_URL must contain only an HTTP(S) public site origin.');
    }

    // Keep the production site's metadata on its final HTTPS www origin.
    if (url.hostname === 'longlink.dev' || url.hostname === 'www.longlink.dev') {
        return 'https://www.longlink.dev';
    }

    return url.origin;
}

export const siteUrl = siteOrigin(import.meta.env.VITE_SITE_URL);
