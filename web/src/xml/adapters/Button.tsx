import { useContext } from 'react';
import { Button as AstryxButton } from '@astryxdesign/core-0-3/Button';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { ActionHandlerContext } from './Action';
import { isXmlEnum, requireXmlString, resolveXml } from '../core/props';
import { BUTTON_HTML_TYPES, BUTTON_VARIANTS, ELEVATIONS, SIZES } from '../constants';

export function Button({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const type = resolveXml(props, 'type', ctx);
    const size = resolveXml(props, 'size', ctx);
    const label = requireXmlString(props, 'label', ctx, 'Button');
    const variant = resolveXml(props, 'variant', ctx);
    const tooltip = resolveXml(props, 'tooltip', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const elevation = resolveXml(props, 'elevation', ctx);
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isIconOnly = resolveXml(props, 'isIconOnly', ctx);
    const isInterruptible = resolveXml(props, 'isInterruptible', ctx);
    const actionHandler = useContext(ActionHandlerContext);

    if (!isXmlEnum(variant, [undefined, ...BUTTON_VARIANTS])) {
        throw new Error(`Unsupported Button variant '${String(variant)}'`);
    }

    if (!isXmlEnum(size, [undefined, ...SIZES])) {
        throw new Error(`Unsupported Button size '${String(size)}'`);
    }

    if (!isXmlEnum(type, [undefined, ...BUTTON_HTML_TYPES])) {
        throw new Error(`Unsupported Button type '${String(type)}'`);
    }

    if (!isXmlEnum(elevation, [undefined, ...ELEVATIONS])) {
        throw new Error(`Unsupported Button elevation '${String(elevation)}'`);
    }

    return (
        <AstryxButton
            type={type}
            size={size}
            label={label}
            variant={variant}
            tooltip={typeof tooltip === 'string' ? tooltip : undefined}
            isLoading={typeof isLoading === 'boolean' ? isLoading : undefined}
            elevation={elevation}
            isDisabled={typeof isDisabled === 'boolean' ? isDisabled : undefined}
            isIconOnly={typeof isIconOnly === 'boolean' ? isIconOnly : undefined}
            clickAction={actionHandler ?? undefined}
            isInterruptible={typeof isInterruptible === 'boolean' ? isInterruptible : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxButton>
    );
}
