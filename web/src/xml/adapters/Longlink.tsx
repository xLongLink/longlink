import { Stack } from '@astryxdesign/core/Stack';
import { useXmlContext } from '@/xml/core/context';
import { renderNode } from '@/xml/core/node';
import type { Props } from '@/xml/types';

/** Renders the root XML page stack; metadata is consumed from `/pages.json`. */
export function Longlink({ nodes }: Props) {
    const { ctx } = useXmlContext();

    return <Stack gap={6}>{renderNode(nodes, ctx)}</Stack>;
}
