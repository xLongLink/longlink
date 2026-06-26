import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiLocation } from '@/lib/types';

/** Fetches the shared location list for selectors and admin views. */
export function useLocations(enabled = true) {
    return useCollectionQuery<ApiLocation>(enabled ? '/api/locations' : null, {
        enabled,
        refetchOnMount: 'always',
    });
}
