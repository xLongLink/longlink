import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';

/** Props accepted by the XML Stack component. */

/** Renders children in a vertical stack. */
export function Stack({ props, nodes }: Props) {
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
