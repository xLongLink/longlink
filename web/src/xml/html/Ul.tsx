import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders an unordered list with standard styling. */
export function Ul({ props, children }: XmlComponentProps) {
    return (
        <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...(props as ComponentPropsWithoutRef<'ul'>)}>
            {renderXml(children)}
        </ul>
    );
}
