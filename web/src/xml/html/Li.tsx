import type { XmlComponentProps } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a list item. */
export function Li({ props, children }: XmlComponentProps) {
    const context = useContext();

    return <li {...(props as ComponentPropsWithoutRef<'li'>)}>{renderNode(children, context.ctx)}</li>;
}
