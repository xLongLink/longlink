import { Code as AstryxCode } from '@astryxdesign/core/Code';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { resolveXmlEnum, resolveXmlValue } from './props';

/** Renders inline Astryx code from a value, translation, or nested XML. */
export function Code({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = resolveXmlValue(props, 'value', ctx);
    const content = props.i18n
        ? resolveTranslation(props, ctx)
        : value != null
          ? String(value)
          : renderNode(nodes, ctx);
    const color = resolveXmlEnum(props, 'color', ctx, ['primary', 'secondary', 'inherit'], 'primary', 'Code');

    return <AstryxCode color={color}>{content}</AstryxCode>;
}
