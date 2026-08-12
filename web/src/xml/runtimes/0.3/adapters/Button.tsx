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
        'secondary',
        'Button'
    );
    const size = resolveXmlEnum(props, 'size', ctx, ['sm', 'md', 'lg'], 'md', 'Button');
    const type = resolveXmlEnum(props, 'type', ctx, ['button', 'submit', 'reset'], 'button', 'Button');
    const isDisabled = resolveXmlBoolean(props, 'isDisabled', ctx, false);
    const isIconOnly = resolveXmlBoolean(props, 'isIconOnly', ctx, false);
    const isLoading = resolveXmlBoolean(props, 'isLoading', ctx, false);
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
