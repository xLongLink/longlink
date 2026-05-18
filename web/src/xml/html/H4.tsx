import { Heading } from '@/components/ui/heading';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h4 bridge component. */
export interface H4Props {
    children?: ASTNode[];
}

/** Renders a quaternary heading with typographic defaults. */
export function H4({ children }: H4Props) {
    const { ctx } = useXmlContext();

    return (
        <Heading anchorClassName="-translate-x-5" level="h4" source={children ?? []}>
            {renderNode(children ?? [], ctx)}
        </Heading>
    );
}
