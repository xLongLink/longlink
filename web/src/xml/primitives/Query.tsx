import type { XMLComponent } from '@/xml';
import { useContext, useUrl } from '@/xml';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

/** Props accepted by the XML Query component. */
export interface QueryProps {
    id?: string;
    path?: string;
    method?: string;
    invalidate?: string | string[];
}

/** Fetches JSON data into a reusable query slot for descendants. */
export const Query: XMLComponent<QueryProps> = ({ id, path }) => {
    const { ctx } = useContext();
    if (!id || !path) return null;

    const values = ctx.values ?? (ctx.values = {});

    const url = useUrl(path);
    const { data, error } = useQuery({
        queryKey: [id, url],
        queryFn: async () => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

            return response.json();
        },
        enabled: Boolean(id && url),
    });

    useEffect(() => {
        if (error) toast.error(error instanceof Error ? error.message : 'Failed to load query data');
    }, [error]);

    values[id] = data ?? {};

    return null;
};
