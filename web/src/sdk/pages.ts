import { type AppNavigationPage } from '@/lib/navigation';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

const toPageList = (value: unknown): AppNavigationPage[] => {
    if (Array.isArray(value)) {
        return value as AppNavigationPage[];
    }

    if (value && typeof value === 'object' && Array.isArray((value as AppMetadata).pages)) {
        return (value as AppMetadata).pages ?? [];
    }

    return [];
};

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
