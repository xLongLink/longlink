import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';

/** Renders a level 4 heading with standard styling. */
export function H4({ children }: XmlComponentProps) {
    return <h4 className="text-xl font-semibold tracking-tight [&:not(:first-child)]:mt-8">{renderXml(children)}</h4>;
}
