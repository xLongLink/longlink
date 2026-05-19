import { Heading } from '@/components/ui/heading';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h1 bridge component. */
export interface H1Props extends Props {}

/** Renders a primary heading with typographic defaults. */
export function H1({ props, nodes }: H1Props) {
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
