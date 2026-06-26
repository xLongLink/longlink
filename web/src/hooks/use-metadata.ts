import { useApiQuery } from '@/hooks/use-api';

type MetadataPage = {
    path: string;
};

type MetadataResponse = {
    pages?: MetadataPage[];
};

/** Fetches XML metadata for one page bundle. */
export function useMetadata(metadataPath: string, enabled: boolean) {
    return useApiQuery<MetadataResponse | null>(enabled ? metadataPath : null, {
        enabled,
        notFound: null,
    });
}

export type { MetadataPage, MetadataResponse };
