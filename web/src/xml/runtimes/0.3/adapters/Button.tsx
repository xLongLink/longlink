import { Button as AstryxButton } from '@astryxdesign/core-0-3/Button';
import { useContext } from 'react';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlBoolean, isXmlEnum, isXmlString, requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';
import { ActionHandlerContext } from './Action';

const BUTTON_ELEVATIONS = ['none', 'low', 'med', 'high'] as const;
const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
const BUTTON_TYPES = ['button', 'submit', 'reset'] as const;
const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'destructive'] as const;

/** Renders an Astryx button with adapter-owned action behavior. */
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

    if (variant != null && !isXmlEnum(variant, BUTTON_VARIANTS)) {
        throw new Error(`Unsupported Button variant '${String(variant)}'`);
    }

    if (size != null && !isXmlEnum(size, BUTTON_SIZES)) {
        throw new Error(`Unsupported Button size '${String(size)}'`);
    }

    if (type != null && !isXmlEnum(type, BUTTON_TYPES)) {
        throw new Error(`Unsupported Button type '${String(type)}'`);
    }

    if (elevation != null && !isXmlEnum(elevation, BUTTON_ELEVATIONS)) {
        throw new Error(`Unsupported Button elevation '${String(elevation)}'`);
    }

    return (
        <AstryxButton
            type={type}
            size={size}
            label={label}
            variant={variant}
            tooltip={isXmlString(tooltip) ? tooltip : undefined}
            isLoading={isXmlBoolean(isLoading) ? isLoading : undefined}
            elevation={elevation}
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isIconOnly={isXmlBoolean(isIconOnly) ? isIconOnly : undefined}
            clickAction={
                actionHandler
                    ? () => {
                          void actionHandler();
                      }
                    : undefined
            }
            isInterruptible={isXmlBoolean(isInterruptible) ? isInterruptible : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxButton>
    );
}
