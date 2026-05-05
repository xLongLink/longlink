import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';

/** Renders a level 1 heading with standard styling. */
export function H1({ children }: XmlComponentProps) {
    return <h1 className="text-4xl font-semibold tracking-tight [&:not(:first-child)]:mt-8">{renderXml(children)}</h1>;
}
