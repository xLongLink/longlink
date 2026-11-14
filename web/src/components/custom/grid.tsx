import { cn } from 'cn';
import type { Spacing } from './types';
import { GridCollapseContext, spacing } from './layout';
import { useCallback, useContext, useSyncExternalStore, type ComponentPropsWithRef } from 'react';

/** Arranges fixed or width-responsive columns; caller styles override layout props. */
export function Grid({
    columns: configuredColumns,
    collapseBelow,
    gap,
    rowGap,
    columnGap,
    align,
    justify,
    width,
    height,
    maxWidth,
    minHeight,
    className,
    style,
    ref,
    children,
    ...props
}: ComponentPropsWithRef<'div'> & {
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
            if (collapseBelow === undefined || !window.matchMedia) return () => {};

            const media = window.matchMedia(`(max-width: ${collapseBelow}px)`);
            media.addEventListener('change', onChange);

            return () => media.removeEventListener('change', onChange);
        },
        [collapseBelow]
    );

    const collapsed = useSyncExternalStore(
        subscribe,
        () =>
            collapseBelow !== undefined &&
            Boolean(window.matchMedia) &&
            window.matchMedia(`(max-width: ${collapseBelow}px)`).matches,
        () => false
    );

    // Cap the track count with a minimum, leaving present tracks free to fill the row.
    const columns = collapsed ? 1 : configuredColumns;
    let template: string | undefined;

    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The public columns contract is a number or responsive track configuration.
    if (typeof columns === 'object') {
        const repeat = columns.repeat === 'fit' ? 'auto-fit' : 'auto-fill';

        const minimum =
            columns.max !== undefined && columns.max > 0
                ? `min(100%, max(${columns.minWidth}px, calc((100% - ${columns.max - 1} * ${spacing(columnGap ?? gap ?? 3)}) / ${columns.max})))`
                : `${columns.minWidth}px`;

        template = `repeat(${repeat}, minmax(${minimum}, 1fr))`;
    } else if (columns !== undefined && columns > 0) {
        template = `repeat(${columns}, 1fr)`;
    }

    return (
        <GridCollapseContext value={collapsed}>
            <div
                {...props}
                ref={ref}
                className={cn('grid grid-cols-1 gap-3', className)}
                style={{
                    gridTemplateColumns: template,
                    rowGap: rowGap !== undefined || gap !== undefined ? spacing(rowGap ?? gap ?? 3) : undefined,
                    columnGap:
                        columnGap !== undefined || gap !== undefined ? spacing(columnGap ?? gap ?? 3) : undefined,
                    alignItems: align,
                    justifyItems: justify,
                    width,
                    height,
                    maxWidth,
                    minHeight,
                    ...style
                }}
            >
                {children}
            </div>
        </GridCollapseContext>
    );
}

/** Spans a View item across grid columns. */
export function GridSpan({
    columns,
    className,
    style,
    ...props
}: ComponentPropsWithRef<'div'> & {
    /** Number of columns to occupy, or full to span the entire grid. */
    columns?: number | 'full';
}) {
    // Avoid implicit extra tracks when the parent collapses to a single column.
    const collapsed = useContext(GridCollapseContext);

    return (
        <div
            {...props}
            className={cn('view-grid-span col-span-1 grid h-full min-w-0 grid-cols-[minmax(0,1fr)]', className)}
            style={{
                gridColumn:
                    collapsed || columns === 'full' ? '1 / -1' : columns === undefined ? undefined : `span ${columns}`,
                ...style
            }}
        />
    );
}
