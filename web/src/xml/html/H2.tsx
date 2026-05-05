import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a level 2 heading with standard styling. */
export function H2({ props, children }: XmlComponentProps) {
    return (
        <h2
            className="text-3xl font-semibold tracking-tight [&:not(:first-child)]:mt-8"
            {...(props as ComponentPropsWithoutRef<'h2'>)}
        >
            {renderXml(children)}
        </h2>
    );
}
