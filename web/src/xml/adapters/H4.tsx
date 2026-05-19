import { Heading } from '@/components/ui/heading';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h4 bridge component. */
export interface H4Props extends Props {}

/** Renders a quaternary heading with typographic defaults. */
export function H4({ props, nodes }: H4Props) {
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
