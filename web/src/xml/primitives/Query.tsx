import type { XmlComponentProps } from '@/xml';
import { RuntimeProvider, evaluate, renderXml, useContext } from '@/xml';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

/** Fetches JSON data into a reusable query slot for descendants. */
export function Query({ props: rawProps, children }: XmlComponentProps) {
    const { ctx, baseUrl, setters, props: contextProps, children } = useContext();
    const id = String(evaluate(rawProps.id ?? '', ctx) ?? '');
    const pathTemplate = String(evaluate(rawProps.path ?? '', ctx) ?? '');
    if (!id) throw new Error('Query requires an "id" parameter');
    if (!pathTemplate) throw new Error('Query requires a "path" parameter');

    const path = pathTemplate;
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

    const childCtx = useMemo(() => ({ ...ctx, [id]: data ?? {} }), [ctx, id, data]);
    const resolvedProps = { id, path: pathTemplate };

    return (
        <RuntimeProvider value={{ ctx: childCtx, baseUrl, setters, props: resolvedProps, children }}>
            {renderXml(children)}
        </RuntimeProvider>
    );
}
