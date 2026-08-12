import { Button as AstryxButton } from '@astryxdesign/core-0-3/Button';
import { useContext } from 'react';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { requireXmlString, resolveXmlBoolean, resolveXmlEnum, resolveXmlString } from '../core/props';
import type { Props } from '../types';
import { ActionHandlerContext } from './Action';

/** Renders an Astryx button with adapter-owned action behavior. */
export function Button({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const label = requireXmlString(props, 'label', ctx, 'Button');
    const variant = resolveXmlEnum(
        props,
        'variant',
        ctx,
        ['primary', 'secondary', 'ghost', 'destructive'],
        'Button'
    ) ?? 'secondary';
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md', 'lg'], 'Button') ?? 'md';
    const type = resolveXmlEnum(props, 'type', ctx, ['button', 'submit', 'reset'], 'Button') ?? 'button';
    const isDisabled = resolveXmlBoolean(props, 'isDisabled', ctx);
    const isIconOnly = resolveXmlBoolean(props, 'isIconOnly', ctx);
    const isLoading = resolveXmlBoolean(props, 'isLoading', ctx);
    const tooltip = resolveXmlString(props, 'tooltip', ctx);
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
            isDisabled={isDisabled}
            isIconOnly={isIconOnly}
            isLoading={isLoading}
            label={label}
            size={size}
            tooltip={tooltip || undefined}
            type={type}
            variant={variant}
        >
            {renderNode(nodes, ctx)}
        </AstryxButton>
    );
}
