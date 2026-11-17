import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useContext, type ComponentPropsWithoutRef } from 'react';
import { GridCollapseContext, spacing } from '@/components/custom/layout';

/** Arranges equal-width columns, automatically collapsing to one column on mobile. */
export function Grid({
    columns: configuredColumns,
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
    // Keep server rendering deterministic while mounted grids follow the shared mobile breakpoint.
    const collapsed = useMediaQuery('(max-width: 768px)');

    // Collapse the configured column count without creating implicit tracks for spanning items.
    const columns = collapsed ? 1 : configuredColumns;

    return (
        <GridCollapseContext value={collapsed}>
            <div
                data-slot="grid"
                {...props}
                className="grid grid-cols-1 gap-3"
                style={{
                    gridTemplateColumns: columns !== undefined && columns > 0 ? `repeat(${columns}, 1fr)` : undefined,
                    gap: gap === undefined ? undefined : spacing(gap),
                    alignItems: align,
                    justifyItems: justify
                }}
            >
                {children}
            </div>
        </GridCollapseContext>
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
    // Avoid implicit extra tracks when the parent collapses to a single column.
    const collapsed = useContext(GridCollapseContext);

    return (
        <div
            data-slot="grid-item"
            {...props}
            className="col-span-1 grid h-full min-w-0 grid-cols-[minmax(0,1fr)]"
            style={{
                gridColumn:
                    collapsed || columns === 'full' ? '1 / -1' : columns === undefined ? undefined : `span ${columns}`
            }}
        />
    );
}
