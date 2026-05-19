import { Heading } from '@/components/ui/heading';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML h2 bridge component. */

/** Renders a secondary heading with typographic defaults. */
export function H2({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return (
        <Heading anchorClassName="-translate-x-7" level="h2" source={children ?? []}>
            {renderNode(children ?? [], ctx)}
        </Heading>
    );
}
