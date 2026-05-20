import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Renders an unordered list with typographic defaults. */
export function Ul({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <ul className="ml-6 list-disc space-y-2">{renderNode(nodes, ctx)}</ul>;
}
