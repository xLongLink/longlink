import { z } from 'zod';
import { useApiQuery } from '@/hooks/use-api';

const pageSchema = z.object({
    tab: z.string().trim().min(1),
    path: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    icon: z.string().trim().min(1).optional(),
    route: z.string().trim(),
});

type RuntimePage = z.infer<typeof pageSchema>;

/** Fetches the registered XML runtime pages. */
export function usePages(pagesPath: string, enabled: boolean) {
    return useApiQuery<RuntimePage[]>(enabled ? pagesPath : null, {
        enabled,
        parse: (value) => z.array(pageSchema).parse(value),
    });
}

export type { RuntimePage };
