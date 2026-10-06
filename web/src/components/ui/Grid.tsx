import type { Spacing } from './types';
import type { ReactNode } from 'react';
import { Grid as AstryxGrid, GridSpan as AstryxGridSpan } from '@astryxdesign/core/Grid';

/** Arranges View content into a fixed number of columns. */
export function Grid(props: { children?: ReactNode; columns?: number; gap?: Spacing }) {
    // Start with one column and the standard content gap.
    return <AstryxGrid {...props} columns={props.columns ?? 1} gap={props.gap ?? 3} />;
}

/** Spans a View item across grid columns. */
export function GridSpan(props: { children?: ReactNode; columns?: number | 'full' }) {
    // Unspecified items occupy one column.
    return <AstryxGridSpan {...props} columns={props.columns ?? 1} />;
}
