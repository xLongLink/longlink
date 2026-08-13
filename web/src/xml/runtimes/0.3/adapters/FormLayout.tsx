import { FormLayout as AstryxFormLayout } from '@astryxdesign/core-0-3/FormLayout';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/FormLayout?tab=properties
 * - children: ReactNode
 */
export function FormLayout({ nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();

    return <AstryxFormLayout>{renderNode(nodes, ctx)}</AstryxFormLayout>;
}
