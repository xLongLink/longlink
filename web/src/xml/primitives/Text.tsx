import type { RenderableASTNode, XMLComponent } from '@xml';

/** Props accepted by the XML Text component. */
export interface TextProps {
    value?: RenderableASTNode | string | number | boolean;
}

/** Renders XML text content through the standard XML renderer. */
export const Text: XMLComponent<TextProps> = ({ value }) => {
    return String(value ?? '');
};
