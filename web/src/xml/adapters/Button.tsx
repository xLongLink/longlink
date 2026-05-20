import { Button as UIButton } from '@ui/button';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import { resolvePath } from '@xml/expressions';
import type { Props } from '@xml/types';
import { resolveXmlBoolean, resolveXmlString, resolveXmlValue } from './props';

/** XML button adapter that renders a styled trigger shell. */
export function Button({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const variant = resolveXmlString(props, 'variant', ctx, 'default');
    const submit = resolveXmlBoolean(props, 'submit', ctx, false);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx, false);
    const appendTarget = resolveXmlString(props, 'append', ctx);

    /** Appends the resolved item to a cart-style array state slot. */
    function handleClick() {
        if (!appendTarget) return;

        const target = resolvePath(ctx, appendTarget.split('.').filter(Boolean));
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

    if (submit) {
        return (
            <UIButton disabled={disabled} size={size as never} type="submit" variant={variant as never} onClick={handleClick}>
                {renderNode(nodes, ctx)}
            </UIButton>
        );
    }

    return (
        <UIButton disabled={disabled} size={size as never} type="button" variant={variant as never} onClick={handleClick}>
            {renderNode(nodes, ctx)}
        </UIButton>
    );
}
