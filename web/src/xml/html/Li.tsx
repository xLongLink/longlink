import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';

/** Renders a list item. */
export function Li({ children }: XmlComponentProps) {
    return <li>{renderXml(children)}</li>;
}
