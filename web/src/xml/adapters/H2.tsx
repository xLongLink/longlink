import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Props accepted by the XML h2 bridge component. */

/** Renders a secondary heading with typographic defaults. */
export function H2({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return (
        <Heading anchorClassName="-translate-x-7" level="h2" source={nodes}>
            {renderNode(nodes, ctx)}
        </Heading>
    );
}
