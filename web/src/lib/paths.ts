/** Removes trailing slashes from a pathname while preserving the root path. */
export function normalizePathname(pathname: string): string {
    return pathname.replace(/\/+$/, '') || '/';
}

/** Finds the longest tab path that matches a pathname. */
export function findActiveTab(tabs: readonly { href: string }[], pathname: string): string | undefined {
    const normalizedPathname = normalizePathname(pathname);

    return tabs.reduce<string | undefined>((best, tab) => {
        const tabPathname = normalizePathname(tab.href);
        if (tabPathname !== normalizedPathname && !normalizedPathname.startsWith(`${tabPathname}/`)) {
            return best;
        }

        return best === undefined || tabPathname.length > best.length ? tabPathname : best;
    }, undefined);
}
