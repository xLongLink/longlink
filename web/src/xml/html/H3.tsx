import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';

/** Renders a level 3 heading with standard styling. */
export function H3({ children }: XmlComponentProps) {
    return <h3 className="text-2xl font-semibold tracking-tight [&:not(:first-child)]:mt-8">{renderXml(children)}</h3>;
}
