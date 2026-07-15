import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';

/** Renders the root shell; page props are consumed from `/pages.json`, not from this component. */
export function Longlink({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <div className="flex flex-col gap-6 text-sm">{renderNode(nodes, ctx)}</div>;
}
