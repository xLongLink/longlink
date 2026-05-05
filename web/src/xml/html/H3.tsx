import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a level 3 heading with standard styling. */
export function H3({ props, children }: XmlComponentProps) {
    return (
        <h3
            className="text-2xl font-semibold tracking-tight [&:not(:first-child)]:mt-8"
            {...(props as ComponentPropsWithoutRef<'h3'>)}
        >
            {renderXml(children)}
        </h3>
    );
}
