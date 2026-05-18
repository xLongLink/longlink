import { Heading } from '@/components/ui/heading';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h3 bridge component. */
export interface H3Props {
    children?: ASTNode[];
}

/** Renders a tertiary heading with typographic defaults. */
export function H3({ children }: H3Props) {
    const { ctx } = useXmlContext();

    return (
        <Heading anchorClassName="-translate-x-5" level="h3" source={children ?? []}>
            {renderNode(children ?? [], ctx)}
        </Heading>
    );
}
