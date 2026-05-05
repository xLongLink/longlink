import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a blockquote with standard styling. */
export function Blockquote({ props, children }: XmlComponentProps) {
    return (
        <blockquote className="mt-6 border-l-2 pl-6 italic" {...(props as ComponentPropsWithoutRef<'blockquote'>)}>
            {renderXml(children)}
        </blockquote>
    );
}
