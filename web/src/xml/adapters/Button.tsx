import { Button as AstryxButton } from '@astryxdesign/core/Button';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { resolvePath } from '@/xml/expressions';
import { useXmlContext } from '@/xml/core/context';
import { useActionHandler } from './Action';
import { resolveXmlBoolean, resolveXmlEnum, resolveXmlLabel, resolveXmlString, resolveXmlValue } from './props';

/** Renders an Astryx button with adapter-owned action behavior. */
export function Button({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const label = resolveXmlLabel(props, ctx, 'Button');
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
    const appendTarget = resolveXmlString(props, 'append', ctx);
    const actionHandler = useActionHandler();

    /** Applies the LongLink append behavior before the nearest Action request. */
    async function handleClick() {
        appendButtonItem(props, ctx, appendTarget);

        // Run the nearest action after local state mutation.
        await actionHandler?.();
    }

    return (
        <AstryxButton
            clickAction={appendTarget || actionHandler ? handleClick : undefined}
            isDisabled={isDisabled}
            isIconOnly={isIconOnly}
            isLoading={isLoading}
            label={label}
            size={size}
            tooltip={tooltip || undefined}
            type={type}
            variant={variant}
        >
            {nodes.length > 0 ? renderNode(nodes, ctx) : undefined}
        </AstryxButton>
    );
}

/** Appends the resolved item to a cart-style array state slot. */
export function appendButtonItem(
    props: Props['props'],
    ctx: ReturnType<typeof useXmlContext>['ctx'],
    appendTarget?: string
) {
    // Skip buttons with no append target.
    const targetPath = appendTarget ?? resolveXmlString(props, 'append', ctx);
    if (!targetPath) return;

    const target = resolvePath(ctx, targetPath.split('.').filter(Boolean));

    // Require an object or array append target.
    if (!target || typeof target !== 'object') return;

    const item = resolveXmlValue(props, 'item', ctx);

    // Append directly to array state targets.
    if (Array.isArray(target)) {
        target.push(item);
        return;
    }

    // Append to value arrays on object state targets.
    if ('value' in target && Array.isArray(target.value)) {
        target.value.push(item);
    }
}
