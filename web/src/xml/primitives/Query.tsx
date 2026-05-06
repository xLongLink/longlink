import type { XmlComponentProps } from '@/xml';
import { RuntimeProvider, evaluate, renderXml, useContext, useUrl } from '@/xml';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

/** Fetches JSON data into a reusable query slot for descendants. */
export function Query({ props: rawProps, children }: XmlComponentProps) {
    const { ctx } = useContext();
    const id = String(evaluate(rawProps.id ?? '', ctx) ?? '');
    const pathTemplate = String(evaluate(rawProps.path ?? '', ctx) ?? '');
    if (!id) throw new Error('Query requires an "id" parameter');
    if (!pathTemplate) throw new Error('Query requires a "path" parameter');

    const url = useUrl(pathTemplate);
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

    const childCtx = useMemo(
        () => ({
            parent: ctx,
            values: {
                [id]: data ?? {},
            },
        }),
        [ctx, id, data]
    );
    return <RuntimeProvider value={childCtx}>{renderXml(children)}</RuntimeProvider>;
}
