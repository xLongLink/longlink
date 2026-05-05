import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';

/** Renders a blockquote with standard styling. */
export function Blockquote({ children }: XmlComponentProps) {
    return <blockquote className="mt-6 border-l-2 pl-6 italic">{renderXml(children)}</blockquote>;
}
