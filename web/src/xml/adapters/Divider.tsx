import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { Divider as UiDivider } from '@/components/ui/Divider';

export function Divider({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <UiDivider>{renderNode(nodes, ctx)}</UiDivider>;
}
