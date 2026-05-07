import { renderNode } from '@/xml';

/** Props accepted by the XML paragraph bridge component. */
export interface PProps {
    children?: unknown;
}

/** Renders a paragraph with standard styling. */
export function P({ children }: PProps) {
    return <p className="leading-7 [&:not(:first-child)]:mt-6">{renderNode(children)}</p>;
}
