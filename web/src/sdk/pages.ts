import { type AppNavigationPage } from '@/lib/navigation';

type AppMetadata = {
    pages?: Array<AppNavigationPage & { content?: string }>;
};

/**
 * Removes a trailing XML extension from a page path.
 */
const normalizePagePath = (path: string): string => path.replace(/\.xml$/i, '');

/**
 * Normalizes a metadata payload into a page list.
 */
const toPageList = (value: unknown): AppNavigationPage[] => {
    if (Array.isArray(value)) {
        return (value as AppNavigationPage[]).map((page) => ({
            ...page,
            path: normalizePagePath(page.path),
        }));
    }

    if (value && typeof value === 'object' && Array.isArray((value as AppMetadata).pages)) {
        return ((value as AppMetadata).pages ?? []).map((page) => ({
            ...page,
            path: normalizePagePath(page.path),
        }));
    }

    return [];
};

/**
 * Extracts pages from a raw metadata response.
 */
export const getPagesFromResponse = (response: unknown): AppNavigationPage[] => {
    if (typeof response === 'string') {
        try {
            return toPageList(JSON.parse(response));
        } catch {
            return [];
        }
    }

    return toPageList(response);
};

/**
 * Returns only pages that belong in the root navigation.
 */
export const getRootPagesFromResponse = (response: unknown): AppNavigationPage[] =>
    getPagesFromResponse(response).filter((page) => !page.path.includes('/'));

/**
 * Returns the page payload for one route from a metadata response.
 */
export const getPageContentFromResponse = (response: unknown, pagePath: string): string | undefined => {
    const pages = getPagesFromResponse(response) as Array<AppNavigationPage & { content?: string }>;
    const normalizedPagePath = normalizePagePath(pagePath);
    return pages.find((page) => page.path === normalizedPagePath)?.content;
};
