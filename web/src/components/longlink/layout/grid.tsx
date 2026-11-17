import type { CSSProperties, ComponentPropsWithoutRef } from 'react';

/** Arranges equal-width columns, automatically collapsing to one column on mobile. */
export function Grid({
    columns,
    gap,
    align,
    justify,
    children,
    ...props
}: Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> & {
    /** Number of equal-width columns. */
    columns?: number;
    gap?: number;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'stretch';
}) {
    // Keep configured tracks above the mobile breakpoint without a viewport subscription.
    return (
        <div
            data-slot="grid"
            {...props}
            className="grid grid-cols-1 gap-3 [@media(width>768px)]:grid-cols-(--grid-columns)"
            style={
                {
                    '--grid-columns':
                        columns !== undefined && columns > 0 ? `repeat(${columns}, 1fr)` : 'repeat(1, 1fr)',
                    gap: gap === undefined ? undefined : `calc(var(--spacing) * ${gap})`,
                    alignItems: align,
                    justifyItems: justify
                } as CSSProperties
            }
        >
            {children}
        </div>
    );
}

/** Spans a View item across grid columns. */
export function GridItem({
    columns,
    ...props
}: Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> & {
    /** Number of columns to occupy, or full to span the entire grid. */
    columns?: number | 'full';
}) {
    // Span the single mobile track without creating implicit extra columns.
    return (
        <div
            data-slot="grid-item"
            {...props}
            className="col-span-full grid h-full min-w-0 grid-cols-[minmax(0,1fr)] [@media(width>768px)]:[grid-column:var(--grid-item-column)]"
            style={{ '--grid-item-column': columns === 'full' ? '1 / -1' : `span ${columns ?? 1}` } as CSSProperties}
        />
    );
}
