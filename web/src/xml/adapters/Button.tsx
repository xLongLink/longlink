import { Button as UIButton, buttonVariants } from '@/components/ui/button';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import { resolvePath } from '@/xml/expressions';
import type { Props } from '@/xml/types';
import type { VariantProps } from 'class-variance-authority';
import { useActionHandler } from './Action';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;
type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;

/** XML button adapter that renders a styled trigger shell. */
export function Button({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const childContent = renderNode(nodes, ctx);
    const text = props.i18n ? resolveTranslation(props, ctx) : childContent;
    const size = resolveButtonSize(resolveXmlString(props, 'size', ctx, 'default'));
    const variant = resolveButtonVariant(resolveXmlString(props, 'variant', ctx, 'default'));
    const submit = resolveXmlBoolean(props, 'submit', ctx, false);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx, false);
    const appendTarget = resolveXmlString(props, 'append', ctx);
    const actionHandler = useActionHandler();

    function handleClick() {
        appendButtonItem(props, ctx, appendTarget);

        if (actionHandler) {
            void actionHandler();
        }
    }

    if (submit) {
        return (
            <UIButton
                disabled={disabled}
                size={size}
                type="submit"
                variant={variant}
                onClick={handleClick}
            >
                {props.i18n ? childContent : null}
                {text}
            </UIButton>
        );
    }

    return (
        <UIButton
            disabled={disabled}
            size={size}
            type="button"
            variant={variant}
            onClick={handleClick}
        >
            {props.i18n ? childContent : null}
            {text}
        </UIButton>
    );
}


/** Resolves a validated XML button size. */
export function resolveButtonSize(value: string): ButtonSize {
    switch (value) {
        case 'default':
        case 'xs':
        case 'sm':
        case 'lg':
        case 'icon':
        case 'icon-xs':
        case 'icon-sm':
        case 'icon-lg':
            return value;
        default:
            throw new Error(`Unsupported Button size '${value}'`);
    }
}


/** Resolves a validated XML button variant. */
export function resolveButtonVariant(value: string): ButtonVariant {
    switch (value) {
        case 'default':
        case 'outline':
        case 'ghost':
        case 'destructive':
        case 'link':
            return value;
        default:
            throw new Error(`Unsupported Button variant '${value}'`);
    }
}

/** Appends the resolved item to a cart-style array state slot. */
export function appendButtonItem(
    props: Props['props'],
    ctx: ReturnType<typeof useXmlContext>['ctx'],
    appendTarget?: string
) {
    const targetPath = appendTarget ?? resolveXmlString(props, 'append', ctx);

    if (!targetPath) return;

    const target = resolvePath(ctx, targetPath.split('.').filter(Boolean));
    if (!target || typeof target !== 'object') return;

    const item = resolveXmlValue(props, 'item', ctx);

    if (Array.isArray(target)) {
        target.push(item);
        return;
    }

    if ('value' in target && Array.isArray(target.value)) {
        target.value.push(item);
    }
}
