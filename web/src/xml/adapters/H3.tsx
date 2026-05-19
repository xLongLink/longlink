import { Heading } from '@/components/ui/heading';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h3 bridge component. */

/** Renders a tertiary heading with typographic defaults. */
export function H3({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return (
        <Heading anchorClassName="-translate-x-5" level="h3" source={children ?? []}>
            {renderNode(children ?? [], ctx)}
        </Heading>
    );
}
