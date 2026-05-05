import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a level 4 heading with standard styling. */
export function H4({ props, children }: XmlComponentProps) {
    return (
        <h4
            className="text-xl font-semibold tracking-tight [&:not(:first-child)]:mt-8"
            {...(props as ComponentPropsWithoutRef<'h4'>)}
        >
            {renderXml(children)}
        </h4>
    );
}
