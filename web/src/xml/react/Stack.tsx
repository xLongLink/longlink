import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Stack component. */
export interface StackProps {
    children?: ASTNode[];
}

/** Renders children in a vertical stack. */
export function Stack({ children }: StackProps) {
    const { ctx } = useXmlContext();

    return (
        <div data-slot="stack" className="flex flex-col gap-4">
            {renderNode(children ?? [], ctx)}
        </div>
    );
}
