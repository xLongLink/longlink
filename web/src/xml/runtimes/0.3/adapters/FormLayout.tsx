import { FormLayout as AstryxFormLayout } from '@astryxdesign/core-0-3/FormLayout';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlEnum, resolveXml } from '../core/props';
import type { Props } from '../types';

/** Arranges Astryx fields with consistent form spacing. */
export function FormLayout({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const directionValue = resolveXml(props, 'direction', ctx);
    const direction = isXmlEnum(directionValue, ['vertical', 'horizontal', 'horizontal-labels']) ? directionValue : 'vertical';

    return <AstryxFormLayout direction={direction}>{renderNode(nodes, ctx)}</AstryxFormLayout>;
}
