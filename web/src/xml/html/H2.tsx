import type { XmlComponentProps } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a level 2 heading with standard styling. */
export function H2({ props, children }: XmlComponentProps) {
    const context = useContext();

    return (
        <h2
            className="text-3xl font-semibold tracking-tight [&:not(:first-child)]:mt-8"
            {...(props as ComponentPropsWithoutRef<'h2'>)}
        >
            {renderNode(children, context.ctx)}
        </h2>
    );
}
