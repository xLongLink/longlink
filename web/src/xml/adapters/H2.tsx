import { Heading } from '@/components/ui/heading';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

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
