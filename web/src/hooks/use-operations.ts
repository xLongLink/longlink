import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiOperation } from '@/lib/types';

/** Fetches the operation list for admin views. */
export function useOperations() {
    return useCollectionQuery<ApiOperation>('/api/operations', {
        refetchOnMount: 'always',
    });
}
