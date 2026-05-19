import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML h4 bridge component. */

/** Renders a quaternary heading with typographic defaults. */
export function H4({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return (
        <Heading anchorClassName="-translate-x-5" level="h4" source={nodes}>
            {renderNode(nodes, ctx)}
        </Heading>
    );
}
