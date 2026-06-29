import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlValue } from './props';

/** Props accepted by the XML li bridge component. */

/** Renders a list item and preserves nested XML children. */
export function Li({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = resolveXmlValue(props, 'value', ctx);
    const text = value != null ? String(value) : props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <li>{text}</li>;
}
