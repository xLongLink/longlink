export const PLATFORM_API_MAJOR = 'v1';

/** Builds a path for the Platform API major bundled with this web client. */
export function platformApiPath(path: string): string {
    // Keep Platform paths relative to the selected major namespace.
    if (!path.startsWith('/') || path.startsWith('//')) {
        throw new Error('Platform API path must start with one slash');
    }

    return `/api/${PLATFORM_API_MAJOR}${path}`;
}
