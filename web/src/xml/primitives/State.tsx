import type { XmlComponentProps } from '@/xml';
import { RuntimeProvider, renderNode, useContext } from '@/xml';
import { useMemo, useState } from 'react';

/** Creates a local reactive state slot for descendant XML nodes. */
export function State({ props, children }: XmlComponentProps) {
    const context = useContext();
    const id = String(props.id ?? '');
    if (!id) throw new Error('State requires an "id" parameter');

    const initialState = useMemo(() => {
        if ('value' in props) return props.value;

        return Object.fromEntries(Object.entries(props).filter(([key]) => key !== 'id'));
    }, [props]);
    const [value, setValue] = useState(initialState);
    const childSetters = useMemo(() => ({ ...(context.setters ?? {}), [id]: setValue }), [context.setters, id]);
    const childCtx = useMemo(
        () => ({ ...context.ctx, [id]: value, __xmlSetters: childSetters }),
        [context.ctx, id, value, childSetters]
    );

    return (
        <RuntimeProvider value={{ ...context, ctx: childCtx, setters: childSetters, props, children }}>
            {renderNode(children, childCtx)}
        </RuntimeProvider>
    );
}
