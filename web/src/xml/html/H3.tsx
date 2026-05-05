import type { XmlComponentProps } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a level 3 heading with standard styling. */
export function H3({ props, children }: XmlComponentProps) {
    const context = useContext();

    return (
        <h3
            className="text-2xl font-semibold tracking-tight [&:not(:first-child)]:mt-8"
            {...(props as ComponentPropsWithoutRef<'h3'>)}
        >
            {renderNode(children, context.ctx)}
        </h3>
    );
}
