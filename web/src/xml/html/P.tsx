import { renderNode, useRuntime } from '@/xml';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type BaseProps = {
    children?: ReactNode;
};

/** Renders a paragraph with standard styling. */
export function P({ children, ...props }: ComponentPropsWithoutRef<'p'> & BaseProps) {
    const { registry, ctx } = useRuntime();

    return (
        <p className="leading-7 [&:not(:first-child)]:mt-6" {...props}>
            {renderNode(children as any, registry, ctx)}
        </p>
    );
}
