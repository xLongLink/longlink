import { useXmlContext } from '@xml/core/context';
import type { Props } from '@xml/types';
import { evaluate } from '../expressions';
import { isText } from '../expressions/utils';
import { readXmlProp } from './props';

/** Props accepted by the XML Text component. */

/** Renders XML text content through the standard XML renderer. */
export function Text({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const rawValue = readXmlProp(props, 'value');

    if (rawValue == null) return '';

    // Plain text should render literally; only expression-shaped text is evaluated.
    if (isText(rawValue)) return rawValue;

    const value = evaluate(rawValue, ctx);

    return value == null ? '' : String(value);
}
