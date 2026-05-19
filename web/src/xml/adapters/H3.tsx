import { Heading } from '@/components/ui/heading';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h3 bridge component. */
export interface H3Props extends Props {}

/** Renders a tertiary heading with typographic defaults. */
export function H3({ props, nodes }: H3Props) {
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
