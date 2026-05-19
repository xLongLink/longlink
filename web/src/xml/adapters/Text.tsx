import { useXmlContext } from '../core/context';
import type { Props } from '../types';
import { resolveXmlString } from './props';
/** Props accepted by the XML Text component. */

/** Renders XML text content through the standard XML renderer. */
export function Text({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const value = resolveXmlString(props, 'value', ctx);
    return value;
}
