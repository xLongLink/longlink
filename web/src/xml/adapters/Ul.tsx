import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';

/** Renders an unordered list with typographic defaults. */
export function Ul({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <ul className="ml-6 list-disc space-y-2">{renderNode(nodes, ctx)}</ul>;
}
