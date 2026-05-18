import { Heading } from '@/components/ui/heading';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h2 bridge component. */
export interface H2Props {
    children?: ASTNode[];
}

/** Renders a secondary heading with typographic defaults. */
export function H2({ children }: H2Props) {
    const { ctx } = useXmlContext();

    return (
        <Heading anchorClassName="-translate-x-7" level="h2" source={children ?? []}>
            {renderNode(children ?? [], ctx)}
        </Heading>
    );
}
