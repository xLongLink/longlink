import { useApiQuery } from '@/hooks/use-api';
import { z } from 'zod';

const metadataPageSchema = z.object({
    tab: z.string().trim().min(1),
    path: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    icon: z.string().trim().min(1).optional(),
    route: z.string().trim().min(1).optional(),
});

const metadataResponseSchema = z.object({
    pages: z.array(metadataPageSchema).optional(),
});

type MetadataPage = z.infer<typeof metadataPageSchema>;
type MetadataResponse = z.infer<typeof metadataResponseSchema>;

/** Fetches XML metadata for one page bundle. */
export function useMetadata(metadataPath: string, enabled: boolean) {
    return useApiQuery<MetadataResponse | null>(enabled ? metadataPath : null, {
        enabled,
        notFound: null,
        parse: (value) => (value === null ? null : metadataResponseSchema.parse(value)),
    });
}

export type { MetadataPage, MetadataResponse };
