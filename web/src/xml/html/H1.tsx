import type { XmlComponentProps } from '@/xml';
import { renderNode, useContext } from '@/xml';
import type { ComponentPropsWithoutRef } from 'react';

/** Renders a level 1 heading with standard styling. */
export function H1({ props, children }: XmlComponentProps) {
    const context = useContext();

    return (
        <h1
            className="text-4xl font-semibold tracking-tight [&:not(:first-child)]:mt-8"
            {...(props as ComponentPropsWithoutRef<'h1'>)}
        >
            {renderNode(children, context.ctx)}
        </h1>
    );
}
