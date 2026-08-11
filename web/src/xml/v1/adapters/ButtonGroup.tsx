import { ButtonGroup as AstryxButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlBoolean, resolveXmlEnum, resolveXmlLabel } from '../core/props';

/** Groups XML buttons with Astryx connected-button semantics. */
export function ButtonGroup({ props, nodes }: Props) {
    const ctx = useXmlContext();
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
