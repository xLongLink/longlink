import { Button as AstryxButton } from '@astryxdesign/core-0-3/Button';
import { useContext } from 'react';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { requireXmlString, resolveXml } from '../core/props';
import type { Props } from '../types';
import { ActionHandlerContext } from './Action';

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

    if (
        variant != null &&
        variant !== 'primary' &&
        variant !== 'secondary' &&
        variant !== 'ghost' &&
        variant !== 'destructive'
    ) {
        throw new Error(`Unsupported Button variant '${String(variant)}'`);
    }

    if (size != null && size !== 'sm' && size !== 'md' && size !== 'lg') {
        throw new Error(`Unsupported Button size '${String(size)}'`);
    }

    if (type != null && type !== 'button' && type !== 'submit' && type !== 'reset') {
        throw new Error(`Unsupported Button type '${String(type)}'`);
    }

    if (
        elevation != null &&
        elevation !== 'none' &&
        elevation !== 'low' &&
        elevation !== 'med' &&
        elevation !== 'high'
    ) {
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
            clickAction={
                actionHandler
                    ? () => {
                          void actionHandler();
                      }
                    : undefined
            }
            isInterruptible={typeof isInterruptible === 'boolean' ? isInterruptible : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxButton>
    );
}
