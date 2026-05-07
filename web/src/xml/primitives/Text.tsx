/** Props accepted by the XML Text component. */
export interface TextProps {
    value: string;
}

/** Renders XML text content through the standard XML renderer. */
export function Text({ value }: TextProps) {
    return value;
}
