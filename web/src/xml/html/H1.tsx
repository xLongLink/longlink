import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a level 1 heading with standard styling. */
export function H1({ props, children }: XmlComponentProps) {
    return (
        <h1
            className="text-4xl font-semibold tracking-tight [&:not(:first-child)]:mt-8"
            {...(props as ComponentPropsWithoutRef<'h1'>)}
        >
            {renderXml(children)}
        </h1>
    );
}
