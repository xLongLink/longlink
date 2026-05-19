import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML h3 bridge component. */

/** Renders a tertiary heading with typographic defaults. */
export function H3({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return (
        <Heading anchorClassName="-translate-x-5" level="h3" source={nodes}>
            {renderNode(nodes, ctx)}
        </Heading>
    );
}
