import { type AppNavigationPage } from '@/lib/navigation';

type AppMetadata = {
    pages?: Array<AppNavigationPage & { content?: string }>;
};

/**
 * Normalizes a metadata payload into a page list.
 */
const toPageList = (value: unknown): AppNavigationPage[] => {
    if (Array.isArray(value)) {
        return value as AppNavigationPage[];
    }

    if (value && typeof value === 'object' && Array.isArray((value as AppMetadata).pages)) {
        return (value as AppMetadata).pages ?? [];
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
 * Returns the page payload for one route from a metadata response.
 */
export const getPageContentFromResponse = (response: unknown, pagePath: string): string | undefined => {
    const pages = getPagesFromResponse(response) as Array<AppNavigationPage & { content?: string }>;
    return pages.find((page) => page.path === pagePath)?.content;
};
