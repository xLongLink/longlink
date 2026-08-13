import { Text as AstryxText } from '@astryxdesign/core-0-3/Text';
import type { Props } from '../types';
import { TEXT_ELEMENTS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, resolveXml, resolveXmlValue } from '../core/props';

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/Text?tab=properties
 * - value: str | int | float | bool
 * - as: string
 */
export function Text({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();

    if (props.value == null) {
        throw new Error('Text requires a value');
    }

    const as = resolveXml(props, 'as', ctx);
    const value = resolveXmlValue(props, 'value', ctx);

    if (!isXmlEnum(as, [undefined, ...TEXT_ELEMENTS])) {
        throw new Error(`Unsupported Text as '${String(as)}'`);
    }

    return <AstryxText as={as}>{String(value)}</AstryxText>;
}
