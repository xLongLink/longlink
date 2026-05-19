import { Button as UIButton } from '@ui/button';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlBoolean, resolveXmlString } from './props';

/** XML button adapter that renders a styled trigger shell. */
export function Button({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const size = resolveXmlString(props, 'size', ctx, 'default');
    const variant = resolveXmlString(props, 'variant', ctx, 'default');
    const submit = resolveXmlBoolean(props, 'submit', ctx, false);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx, false);

    if (submit) {
        return (
            <UIButton disabled={disabled} size={size as never} type="submit" variant={variant as never}>
                {renderNode(nodes, ctx)}
            </UIButton>
        );
    }

    return (
        <UIButton disabled={disabled} size={size as never} type="button" variant={variant as never}>
            {renderNode(nodes, ctx)}
        </UIButton>
    );
}
