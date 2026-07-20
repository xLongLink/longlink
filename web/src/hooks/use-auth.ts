import type { ApiAuthConfig } from '@/lib/types';
import { useApiQuery } from '@/hooks/use-api';
import { apiAuthConfigSchema, parseApiResponse } from '@/lib/api-schemas';

/** Fetches the authentication methods enabled by the LongLink Platform. */
export function useAuthConfig() {
    return useApiQuery<ApiAuthConfig>('/auth/config', {
        parse: (value) => parseApiResponse(apiAuthConfigSchema, value),
        retry: false,
        staleTime: 60_000,
    });
}
