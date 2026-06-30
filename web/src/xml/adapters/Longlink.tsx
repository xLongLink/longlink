import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';

/** Renders the root shell; metadata props are consumed from `/metadata.json`, not from this component. */
export function Longlink({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <div className="flex flex-col gap-6 text-sm">{renderNode(nodes, ctx)}</div>;
}
