import { ButtonGroup as AstryxButtonGroup } from '@astryxdesign/core/ButtonGroup';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveXmlBoolean, resolveXmlEnum, resolveXmlLabel } from './props';

/** Groups XML buttons with Astryx connected-button semantics. */
export function ButtonGroup({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const label = resolveXmlLabel(props, ctx, 'ButtonGroup');
    const orientation = resolveXmlEnum(
        props,
        'orientation',
        ctx,
        ['horizontal', 'vertical'],
        'horizontal',
        'ButtonGroup'
    );
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md', 'lg'], 'md', 'ButtonGroup');
    const isDisabled = resolveXmlBoolean(props, 'isDisabled', ctx, false);

    return (
        <AstryxButtonGroup isDisabled={isDisabled} label={label} orientation={orientation} size={size}>
            {renderNode(nodes, ctx)}
        </AstryxButtonGroup>
    );
}
