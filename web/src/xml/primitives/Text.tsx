import type { ComponentType } from 'react';

/** Props accepted by the XML Text component. */
export interface TextProps {
    value: string;
}

/** Renders XML text content through the standard XML renderer. */
export const Text: ComponentType<TextProps> = ({ value }) => value;
