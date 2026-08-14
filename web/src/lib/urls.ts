export const SITE_URL = 'https://longlink.dev';

/** Returns the canonical document path served by FastAPI. */
export function publicRoutePath(routePath: string): string {
    return routePath === '/' ? '/' : `${routePath}/`;
}
