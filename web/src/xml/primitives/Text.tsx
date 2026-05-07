import type { RenderableASTNode, XMLComponent } from '@xml';
import { evaluate } from '@xml/core/expressions';
import { useContext } from '@xml/core/runtime';

/** Props accepted by the XML Text component. */
export interface TextProps {
    value?: RenderableASTNode | string | number | boolean;
}

/** Renders XML text content through the standard XML renderer. */
export const Text: XMLComponent<TextProps> = ({ value }) => {
    const { ctx } = useContext();

    return String(typeof value === 'string' ? evaluate(value, ctx) : (value ?? ''));
};
