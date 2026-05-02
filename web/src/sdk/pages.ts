import { type AppNavigationPage } from '@/lib/navigation';

type AppMetadata = {
    pages?: AppNavigationPage[];
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
