import type { XMLComponent } from '@/xml';

/** Props accepted by the XML Text component. */
export interface TextProps {
    value?: unknown;
}

/** Renders XML text content through the standard XML renderer. */
export const Text: XMLComponent<TextProps> = ({ props, children }) => {
    const { value } = props;

    return String(value ?? children ?? '');
};
