import type { XmlComponentProps } from '@/xml';
import { RuntimeProvider, renderNode, useContext } from '@/xml';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

/** Fetches JSON data into a reusable query slot for descendants. */
export function Query({ props, children }: XmlComponentProps) {
    const context = useContext();
    const id = String(props.id ?? '');
    const pathTemplate = String(props.path ?? '');
    if (!id) throw new Error('Query requires an "id" parameter');
    if (!pathTemplate) throw new Error('Query requires a "path" parameter');

    const path = pathTemplate;
    const baseUrl = String(context.options?.baseUrl ?? '');
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
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

    const childCtx = useMemo(() => ({ ...context.ctx, [id]: data ?? {} }), [context.ctx, id, data]);

    return (
        <RuntimeProvider value={{ ...context, ctx: childCtx, props, children }}>
            {renderNode(children, childCtx)}
        </RuntimeProvider>
    );
}
