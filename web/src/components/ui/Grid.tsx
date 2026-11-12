import type { Spacing } from './types';
import { GridCollapseContext, spacing } from './layout';
import { useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react';

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
    // Subscribe only while a viewport collapse threshold is configured; SSR retains desktop geometry.
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (props.collapseBelow === undefined || !window.matchMedia) return () => {};

            const media = window.matchMedia(`(max-width: ${props.collapseBelow}px)`);
            media.addEventListener('change', onChange);

            return () => media.removeEventListener('change', onChange);
        },
        [props.collapseBelow]
    );

    const collapsed = useSyncExternalStore(
        subscribe,
        () =>
            props.collapseBelow !== undefined &&
            Boolean(window.matchMedia) &&
            window.matchMedia(`(max-width: ${props.collapseBelow}px)`).matches,
        () => false
    );

    // Cap the track count with a minimum, leaving present tracks free to fill the row.
    const columns = collapsed ? 1 : (props.columns ?? 1);
    let template = '1fr';

    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The public columns contract is a number or responsive track configuration.
    if (typeof columns === 'object') {
        const repeat = columns.repeat === 'fit' ? 'auto-fit' : 'auto-fill';

        const minimum =
            columns.max !== undefined && columns.max > 0
                ? `min(100%, max(${columns.minWidth}px, calc((100% - ${columns.max - 1} * ${spacing(props.columnGap ?? props.gap ?? 3)}) / ${columns.max})))`
                : `${columns.minWidth}px`;

        template = `repeat(${repeat}, minmax(${minimum}, 1fr))`;
    } else if (columns > 0) {
        template = `repeat(${columns}, 1fr)`;
    }

    return (
        <GridCollapseContext value={collapsed}>
            <div
                className="view-grid"
                style={{
                    gridTemplateColumns: template,
                    rowGap: spacing(props.rowGap ?? props.gap ?? 3),
                    columnGap: spacing(props.columnGap ?? props.gap ?? 3),
                    alignItems: props.align,
                    justifyItems: props.justify,
                    width: props.width,
                    height: props.height,
                    maxWidth: props.maxWidth,
                    minHeight: props.minHeight,
                }}
            >
                {props.children}
            </div>
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

    return (
        <div
            className="view-grid-span"
            style={{ gridColumn: collapsed || props.columns === 'full' ? '1 / -1' : `span ${props.columns ?? 1}` }}
        >
            {props.children}
        </div>
    );
}
