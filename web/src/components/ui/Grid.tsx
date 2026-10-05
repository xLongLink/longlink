import type { Spacing } from './types';
import type { ReactNode } from 'react';
import { Grid as AstryxGrid, GridSpan as AstryxGridSpan } from '@astryxdesign/core/Grid';

/** Arranges View content into a fixed number of columns. */
export function Grid(props: { children?: ReactNode; columns?: number; gap?: Spacing }) {
    return <AstryxGrid {...props} />;
}

/** Spans a View item across grid columns. */
export function GridSpan(props: { children?: ReactNode; columns?: number | 'full' }) {
    return <AstryxGridSpan {...props} />;
}
