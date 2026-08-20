import { renderNode } from './node';
import { resolveXml, resolveXmlValue } from './props';
import type { Props } from '../types';
import { useXmlRuntime, XmlContext } from './context';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, nodes }: Props) {
    const runtime = useXmlRuntime();
    const ctx = runtime.scope;
    const resolvedAs = resolveXml(props, 'as', ctx);
    const as = typeof resolvedAs === 'string' ? resolvedAs : '';
    const each = resolveXmlValue(props, 'each', ctx);

    // Skip loop rendering when the source is not an array.
    if (!Array.isArray(each)) return null;

    return each.map((item, index) => {
        const childCtx = {
            parent: ctx,
            bindings: {
                [as]: item,
                index,
            },
        };

        return (
            <XmlContext.Provider key={index} value={{ ...runtime, scope: childCtx }}>
                {renderNode(nodes, childCtx)}
            </XmlContext.Provider>
        );
    });
}
