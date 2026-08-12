import { Button as AstryxButton } from '@astryxdesign/core-0-3/Button';
import { useContext } from 'react';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlBoolean, isXmlEnum, isXmlString, requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';
import { ActionHandlerContext } from './Action';

/** Renders an Astryx button with adapter-owned action behavior. */
export function Button({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const label = requireXmlString(props, 'label', ctx, 'Button');
    const variantValue = resolveXml(props, 'variant', ctx);
    const sizeValue = resolveXml(props, 'size', ctx);
    const typeValue = resolveXml(props, 'type', ctx);
    const variant = isXmlEnum(variantValue, ['primary', 'secondary', 'ghost', 'destructive']) ? variantValue : 'secondary';
    const size = isXmlEnum(sizeValue, ['sm', 'md', 'lg']) ? sizeValue : 'md';
    const type = isXmlEnum(typeValue, ['button', 'submit', 'reset']) ? typeValue : 'button';
    const isDisabled = resolveXml(props, 'isDisabled', ctx);
    const isIconOnly = resolveXml(props, 'isIconOnly', ctx);
    const isLoading = resolveXml(props, 'isLoading', ctx);
    const tooltip = resolveXml(props, 'tooltip', ctx);
    const actionHandler = useContext(ActionHandlerContext);

    return (
        <AstryxButton
            clickAction={
                actionHandler
                    ? () => {
                          void actionHandler();
                      }
                    : undefined
            }
            isDisabled={isXmlBoolean(isDisabled) ? isDisabled : undefined}
            isIconOnly={isXmlBoolean(isIconOnly) ? isIconOnly : undefined}
            isLoading={isXmlBoolean(isLoading) ? isLoading : undefined}
            label={label}
            size={size}
            tooltip={isXmlString(tooltip) ? tooltip : undefined}
            type={type}
            variant={variant}
        >
            {renderNode(nodes, ctx)}
        </AstryxButton>
    );
}
