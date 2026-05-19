import { useXmlContext } from '@xml/core/context';
import type { Props } from '@xml/types';
import { resolveXmlString } from './props';
/** Props accepted by the XML Text component. */

/** Renders XML text content through the standard XML renderer. */
export function Text({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = resolveXmlString(props, 'value', ctx);
    return value;
}
