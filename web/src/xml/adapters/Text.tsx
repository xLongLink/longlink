import type { Props } from '@xml';
import { useXmlContext } from '@xml';
import { resolveXmlString } from './props';
/** Props accepted by the XML Text component. */
export interface TextProps extends Props {}

/** Renders XML text content through the standard XML renderer. */
export function Text({ props, nodes }: TextProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const value = resolveXmlString(props, 'value', ctx);
    return value;
}
