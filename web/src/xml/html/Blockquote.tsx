import type { XmlComponentProps } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a blockquote with standard styling. */
export function Blockquote({ props, children }: XmlComponentProps) {
    const context = useContext();

    return (
        <blockquote className="mt-6 border-l-2 pl-6 italic" {...(props as ComponentPropsWithoutRef<'blockquote'>)}>
            {renderNode(children, context.ctx)}
        </blockquote>
    );
}
