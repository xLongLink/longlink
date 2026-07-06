import { Button as UIButton } from '@/components/ui/button';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import { resolvePath } from '@/xml/expressions';
import type { Props } from '@/xml/types';
import { useActionHandler } from './Action';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** XML button adapter that renders a styled trigger shell. */
export function Button({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const childContent = renderNode(nodes, ctx);
    const text = props.i18n ? resolveTranslation(props, ctx) : childContent;
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const variant = resolveXmlString(props, 'variant', ctx, 'default');
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
                size={size as never}
                type="submit"
                variant={variant as never}
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
            size={size as never}
            type="button"
            variant={variant as never}
            onClick={handleClick}
        >
            {props.i18n ? childContent : null}
            {text}
        </UIButton>
    );
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
