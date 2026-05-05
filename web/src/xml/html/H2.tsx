import { renderNode, useRuntime } from '@/xml';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a level 2 heading with standard styling. */
export function H2({ children, ...props }: ComponentPropsWithoutRef<'h2'> & BaseProps) {
    const { registry, ctx } = useRuntime();

    return (
        <h2 className="text-3xl font-semibold tracking-tight [&:not(:first-child)]:mt-8" {...props}>
            {renderNode(children as any, registry, ctx)}
        </h2>
    );
}
