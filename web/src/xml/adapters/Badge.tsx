import { Badge as UIBadge } from '@ui/badge';
import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlString, resolveXmlValue } from './props';

/** Renders a shadcn-backed badge for short status labels and tags. */
export function Badge({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = props.i18n ? undefined : resolveXmlValue(props, 'value', ctx);
    const text = value != null ? String(value) : props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);
    const variant = resolveXmlString(props, 'variant', ctx, 'default');

    return <UIBadge variant={variant as never}>{text}</UIBadge>;
}
