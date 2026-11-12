import type { Spacing } from './types';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { createContext, useContext, type ReactNode } from 'react';
import { Grid as AstryxGrid, GridSpan as AstryxGridSpan } from '@/components/astryx/Grid';

// Collapsed grids keep spanning children within their single explicit column.
const GridCollapseContext = createContext(false);

/** Arranges View content into fixed or width-responsive columns. */
export function Grid(props: {
    children?: ReactNode;
    /** Fixed columns or responsive tracks with a minimum width in pixels and optional column cap. Use one-column or full spans with responsive tracks. */
    columns?: number | { minWidth: number; max?: number; repeat?: 'fill' | 'fit' };
    /** Collapse to one column at or below this View viewport width in pixels, including all GridSpan children. */
    collapseBelow?: number;
    gap?: Spacing;
    rowGap?: Spacing;
    columnGap?: Spacing;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'stretch';
    width?: number | string;
    height?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
}) {
    // Let Astryx reflow galleries; explicit viewport collapse preserves unequal desktop spans.
    const { collapseBelow, ...grid } = props;
    const narrow = useMediaQuery(`(max-width: ${collapseBelow ?? 0}px)`);
    const collapsed = collapseBelow !== undefined && narrow;

    return (
        <GridCollapseContext value={collapsed}>
            <AstryxGrid {...grid} columns={collapsed ? 1 : (props.columns ?? 1)} gap={props.gap ?? 3} />
        </GridCollapseContext>
    );
}

/** Spans a View item across grid columns. */
export function GridSpan(props: {
    /** Content rendered inside the grid item. */
    children?: ReactNode;
    /** Number of columns to occupy, or full to span the entire grid. */
    columns?: number | 'full';
}) {
    // Avoid implicit extra tracks when the parent collapses to a single column.
    const collapsed = useContext(GridCollapseContext);

    return <AstryxGridSpan {...props} columns={collapsed ? 'full' : (props.columns ?? 1)} />;
}
