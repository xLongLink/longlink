import type { XmlComponentProps } from '@/xml';
import { renderNode } from '@/xml';

/** Renders a paragraph with standard styling. */
export function P({ children }: XmlComponentProps) {
    return <p className="leading-7 [&:not(:first-child)]:mt-6">{renderNode(children)}</p>;
}
