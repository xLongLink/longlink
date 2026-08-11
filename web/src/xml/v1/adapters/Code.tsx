import { Code as AstryxCode } from '@astryxdesign/core/Code';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import { resolveXmlContent, resolveXmlEnum, resolveXmlValue } from '../core/props';
import type { Props } from '../types';

/** Renders inline Astryx code from a value, translation, or nested XML. */
export function Code({ props, nodes }: Props) {
    const ctx = useXmlContext();
    const value = resolveXmlValue(props, 'value', ctx);
    const content = resolveXmlContent(props, ctx, value, () => renderNode(nodes, ctx));
    const color = resolveXmlEnum(props, 'color', ctx, ['primary', 'secondary', 'inherit'], 'primary', 'Code');

    return <AstryxCode color={color}>{content}</AstryxCode>;
}
