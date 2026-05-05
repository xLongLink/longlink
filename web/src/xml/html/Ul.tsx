import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';

/** Renders an unordered list with standard styling. */
export function Ul({ children }: XmlComponentProps) {
    return <ul className="my-6 ml-6 list-disc [&>li]:mt-2">{renderXml(children)}</ul>;
}
