import { Card as AstryxCard } from '@astryxdesign/core-0-3/Card';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/Card?tab=properties
 * - children: ReactNode
 */
export function Card({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <AstryxCard>{renderNode(nodes, ctx)}</AstryxCard>;
}
