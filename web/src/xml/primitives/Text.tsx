import type { XmlComponentProps } from '@/xml';
import { evaluate, useContext } from '@/xml';

/** Renders XML text content through the standard XML renderer. */
export function Text({ props: rawProps }: XmlComponentProps) {
    const context = useContext();

    const raw = rawProps.text ?? rawProps.value;

    if (typeof raw !== 'string') return null;

    const value = evaluate(raw, context.ctx);

    if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    throw new Error(
        `XML text expression resolved to ${Array.isArray(value) ? 'an array' : typeof value}, which cannot be rendered as text`
    );
}
