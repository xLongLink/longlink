import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';

/** Renders XML text content through the standard XML renderer. */
export function Text({ children }: XmlComponentProps) {
    return renderXml(children);
}
