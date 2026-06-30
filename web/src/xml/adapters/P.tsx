import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import type { Props } from '@xml/types';
import { resolveXmlValue } from './props';

/** Renders a paragraph with standard styling. */
export function P({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = props.i18n ? undefined : resolveXmlValue(props, 'value', ctx);
    const text = value != null ? String(value) : props.i18n ? resolveTranslation(props, ctx) : renderNode(nodes, ctx);

    return <p className="leading-7">{text}</p>;
}
