import type { z } from 'zod';
import { api } from '@/lib/api';
import { skipToken, useMutation, useQuery } from '@tanstack/react-query';

/** Reads and validates Platform data, disabling dependent queries until their path is known. */
export function useApi<T>(path: string | null, schema: z.ZodType<T>) {
    return useQuery({
        queryKey: ['api', path],
        queryFn: path === null ? skipToken : async ({ signal }) => schema.parse(await api(path, { signal }).json()),
        retry: false,
        staleTime: 0,
    });
}

/** Runs a page action with pending state and root-owned mutation error reporting. */
export function useAction() {
    return useMutation({ mutationFn: async (run: () => Promise<void>) => run() });
}
