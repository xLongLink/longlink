import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';

/** Renders a paragraph with standard styling. */
export function P({ children }: XmlComponentProps) {
    return <p className="leading-7 [&:not(:first-child)]:mt-6">{renderXml(children)}</p>;
}
