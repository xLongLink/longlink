import { renderNode, useRuntime } from '@/xml';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a level 4 heading with standard styling. */
export function H4({ children, ...props }: ComponentPropsWithoutRef<'h4'> & BaseProps) {
    const { registry, ctx } = useRuntime();

    return (
        <h4 className="text-xl font-semibold tracking-tight [&:not(:first-child)]:mt-8" {...props}>
            {renderNode(children as any, registry, ctx)}
        </h4>
    );
}
