import { cn } from 'cn';
import { spacing } from './spacing';
import type { CSSProperties, ComponentPropsWithoutRef } from 'react';

type GridColumns = number | { base?: number; sm?: number; md?: number; lg?: number; xl?: number };

/** Arranges equal-width columns with optional breakpoint-specific column counts. */
export function Grid({
    columns,
    gap,
    padding,
    paddingInline = padding,
    paddingBlock = padding,
    align,
    justify,
    children,
    ...props
}: Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> & {
    /** Number of equal-width columns. */
    columns?: GridColumns;
    gap?: number;
    padding?: number;
    paddingInline?: number;
    paddingBlock?: number;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'stretch';
}) {
    const tracks = typeof columns === 'number' ? { md: columns } : columns;

    // Preserve numeric layouts' mobile breakpoint while explicit counts use the theme breakpoints.
    return (
        <div
            data-slot="grid"
            {...props}
            className={cn(
                'grid min-w-0 gap-3',
                typeof columns === 'object'
                    ? 'grid-cols-(--grid-columns-base) sm:grid-cols-(--grid-columns-sm) md:grid-cols-(--grid-columns-md) lg:grid-cols-(--grid-columns-lg) xl:grid-cols-(--grid-columns-xl)'
                    : 'grid-cols-1 [@media(width>768px)]:grid-cols-(--grid-columns-md)'
            )}
            style={
                {
                    '--grid-columns-base': `repeat(${Math.max(1, tracks?.base ?? 1)}, minmax(0, 1fr))`,
                    '--grid-columns-sm': tracks?.sm
                        ? `repeat(${Math.max(1, tracks.sm)}, minmax(0, 1fr))`
                        : 'var(--grid-columns-base)',
                    '--grid-columns-md': tracks?.md
                        ? `repeat(${Math.max(1, tracks.md)}, minmax(0, 1fr))`
                        : 'var(--grid-columns-sm)',
                    '--grid-columns-lg': tracks?.lg
                        ? `repeat(${Math.max(1, tracks.lg)}, minmax(0, 1fr))`
                        : 'var(--grid-columns-md)',
                    '--grid-columns-xl': tracks?.xl
                        ? `repeat(${Math.max(1, tracks.xl)}, minmax(0, 1fr))`
                        : 'var(--grid-columns-lg)',
                    gap: spacing(gap),
                    paddingInline: spacing(paddingInline),
                    paddingBlock: spacing(paddingBlock),
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
