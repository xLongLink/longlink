import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML h1 bridge component. */

/** Renders a primary heading with typographic defaults. */
export function H1({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return (
        <Heading anchorClassName="-translate-x-7" level="h1" source={children ?? []}>
            {renderNode(children ?? [], ctx)}
        </Heading>
    );
}
