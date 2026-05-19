import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Stack component. */
export interface StackProps extends Props {}

/** Renders children in a vertical stack. */
export function Stack({ props, nodes }: StackProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;

    return (
        <div data-slot="stack" className="flex flex-col gap-4">
            {renderNode(children ?? [], ctx)}
        </div>
    );
}
