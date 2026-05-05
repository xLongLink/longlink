import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a paragraph with standard styling. */
export function P({ props, children }: XmlComponentProps) {
    return (
        <p className="leading-7 [&:not(:first-child)]:mt-6" {...(props as ComponentPropsWithoutRef<'p'>)}>
            {renderXml(children)}
        </p>
    );
}
