import { renderNode } from './node';
import type { Props } from '../types';
import { useXmlRuntime, XmlContext } from './context';
import { resolveXml, resolveXmlValue } from './props';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, nodes }: Props) {
    const { scope: ctx, ...runtime } = useXmlRuntime();

    // Require the loop alias and source before resolving them.
    if (!props.as) throw new Error('For requires an "as" parameter');
    if (!props.each) throw new Error('For requires an "each" parameter');

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
