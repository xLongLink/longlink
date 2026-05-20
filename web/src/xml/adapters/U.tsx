import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Renders underlined text. */
export function U({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <u className="underline underline-offset-4">{renderNode(nodes, ctx)}</u>;
}
