import { renderNode } from './node';
import type { Props } from '../types';
import { useXmlRuntime, XmlContext } from './context';
import { resolveXml, resolveXmlValue } from './props';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, nodes }: Props) {
    const { scope: ctx, services } = useXmlRuntime();

    // Require the loop alias and source before resolving them.
    if (props.as === undefined) throw new Error('For requires an "as" parameter');
    if (props.each === undefined) throw new Error('For requires an "each" parameter');
    if (props.key === undefined) throw new Error('For requires a "key" parameter');

    const resolvedAs = resolveXml(props, 'as', ctx);
    const as = typeof resolvedAs === 'string' ? resolvedAs : '';
    const each = resolveXmlValue(props, 'each', ctx);

    // Skip loop rendering when the source is not an array.
    if (!Array.isArray(each)) return null;

    const keys = new Set<string>();

    return each.map((item, index) => {
        const childCtx = {
            parent: ctx,
            bindings: {
                [as]: item,
                index,
            },
        };
        const key = resolveXmlValue(props, 'key', childCtx);

        if (typeof key !== 'string' && typeof key !== 'number') {
            throw new Error('For key must resolve to a string or number');
        }
        const stableKey = String(key);

        if (keys.has(stableKey)) {
            throw new Error('For keys must be unique within an array');
        }
        keys.add(stableKey);

        return (
            <XmlContext.Provider key={stableKey} value={{ services, scope: childCtx }}>
                {renderNode(nodes, childCtx)}
            </XmlContext.Provider>
        );
    });
}
