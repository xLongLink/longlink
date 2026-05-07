/** Props accepted by the XML Text component. */
export interface TextProps {
    text?: unknown;
    value?: unknown;
}

/** Renders XML text content through the standard XML renderer. */
export function Text({ props: rawProps }: { props: TextProps }) {
    const raw = rawProps.text ?? rawProps.value;

    if (typeof raw !== 'string') return null;

    const value = raw;

    if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    throw new Error(
        `XML text expression resolved to ${Array.isArray(value) ? 'an array' : typeof value}, which cannot be rendered as text`
    );
}
