import { Code as AstryxCode } from '@astryxdesign/core/Code';
import { useXmlContext } from '../core/context';
import { resolveTranslation } from '../core/i18n';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlEnum, resolveXmlValue } from './props';

/** Renders inline Astryx code from a value, translation, or nested XML. */
export function Code({ props, nodes }: Props) {
    const ctx = useXmlContext();
    const value = resolveXmlValue(props, 'value', ctx);
    const content = props.i18n
        ? resolveTranslation(props, ctx)
        : value != null
          ? String(value)
          : renderNode(nodes, ctx);
    const color = resolveXmlEnum(props, 'color', ctx, ['primary', 'secondary', 'inherit'], 'primary', 'Code');

    return <AstryxCode color={color}>{content}</AstryxCode>;
}
