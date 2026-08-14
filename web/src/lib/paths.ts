/** Removes trailing slashes from a pathname while preserving the root path. */
export function normalizePathname(pathname: string): string {
    return pathname.replace(/\/+$/, '') || '/';
}
