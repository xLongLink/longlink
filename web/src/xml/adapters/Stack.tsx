import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';

/** Renders children in a vertical stack. */
export function Stack({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return (
        <div data-slot="stack" className="flex flex-col gap-4">
            {renderNode(nodes, ctx)}
        </div>
    );
}
