import type { XmlComponentProps } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders an unordered list with standard styling. */
export function Ul({ props, children }: XmlComponentProps) {
    const context = useContext();

    return (
        <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...(props as ComponentPropsWithoutRef<'ul'>)}>
            {renderNode(children, context.ctx)}
        </ul>
    );
}
