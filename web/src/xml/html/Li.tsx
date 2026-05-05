import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a list item. */
export function Li({ props, children }: XmlComponentProps) {
    return <li {...(props as ComponentPropsWithoutRef<'li'>)}>{renderXml(children)}</li>;
}
