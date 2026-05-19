import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML h4 bridge component. */

/** Renders a quaternary heading with typographic defaults. */
export function H4({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return (
        <Heading anchorClassName="-translate-x-5" level="h4" source={children ?? []}>
            {renderNode(children ?? [], ctx)}
        </Heading>
    );
}
