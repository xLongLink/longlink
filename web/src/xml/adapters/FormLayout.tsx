import { FormLayout as AstryxFormLayout } from '@astryxdesign/core/FormLayout';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveXmlEnum } from './props';

/** Arranges Astryx fields with consistent form spacing. */
export function FormLayout({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const direction = resolveXmlEnum(
        props,
        'direction',
        ctx,
        ['vertical', 'horizontal', 'horizontal-labels'],
        'vertical',
        'FormLayout'
    );

    return <AstryxFormLayout direction={direction}>{renderNode(nodes, ctx)}</AstryxFormLayout>;
}
