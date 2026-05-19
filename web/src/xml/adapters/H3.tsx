import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML h3 bridge component. */

/** Renders a tertiary heading with typographic defaults. */
export function H3({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;

    return (
        <Heading anchorClassName="-translate-x-5" level="h3" source={children ?? []}>
            {renderNode(children ?? [], ctx)}
        </Heading>
    );
}
