import { Heading } from '@/components/ui/heading';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h1 bridge component. */
export interface H1Props {
    children?: ASTNode[];
}

/** Renders a primary heading with typographic defaults. */
export function H1({ children }: H1Props) {
    const { ctx } = useXmlContext();

    return (
        <Heading anchorClassName="-translate-x-7" level="h1" source={children ?? []}>
            {renderNode(children ?? [], ctx)}
        </Heading>
    );
}
