import { FormLayout as AstryxFormLayout } from '@astryxdesign/core-0-3/FormLayout';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { FORM_DIRECTIONS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, resolveXml } from '../core/props';

/**
 * checked: false
 * https://astryx.atmeta.com/components/FormLayout?tab=properties
 * - direction: str
 * - children: ReactNode
 */
export function FormLayout({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const directionValue = resolveXml(props, 'direction', ctx);
    const direction = isXmlEnum(directionValue, FORM_DIRECTIONS) ? directionValue : 'vertical';

    return <AstryxFormLayout direction={direction}>{renderNode(nodes, ctx)}</AstryxFormLayout>;
}
