import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml, useContext } from '@/xml';

/** Renders XML text content through the standard XML renderer. */
export function Text({ children }: XmlComponentProps) {
    const context = useContext();

    if (typeof children === 'string') {
        const value = evaluate(children, context.ctx);

        if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }

        throw new Error(
            `XML text expression resolved to ${Array.isArray(value) ? 'an array' : typeof value}, which cannot be rendered as text`
        );
    }

    return renderXml(children);
}
