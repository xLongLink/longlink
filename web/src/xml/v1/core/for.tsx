import { evaluate } from '../expressions';
import type { Props } from '../types';
import { useXmlContext, XmlContext } from './context';
import { renderNode } from './node';
import { resolveXmlString } from './props';

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, nodes }: Props) {
    const ctx = useXmlContext();
    const as = resolveXmlString(props, 'as', ctx);
    const each = props.each ? evaluate(props.each, ctx) : undefined;

    // Skip loop rendering when the source is not an array.
    if (!Array.isArray(each)) return null;

    return each.map((item, index) => {
        const childCtx = {
            ...ctx,
            parent: ctx,
            values: {
                [as]: item,
                index,
            },
        };

        return (
            <XmlContext.Provider key={index} value={childCtx}>
                {renderNode(nodes, childCtx)}
            </XmlContext.Provider>
        );
    });
}
