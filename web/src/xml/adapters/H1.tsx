import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML h1 bridge component. */

/** Renders a primary heading with typographic defaults. */
export function H1({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return (
        <Heading anchorClassName="-translate-x-7" level="h1" source={nodes}>
            {renderNode(nodes, ctx)}
        </Heading>
    );
}
