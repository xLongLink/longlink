import type { ReactNode } from 'react';
import { Table as AstryxTable, type ColumnWidth } from '@astryxdesign/core/Table';

export { proportional, pixel } from '@astryxdesign/core/Table';

type TableProps<T extends Record<string, unknown>> = {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    data: T[];
    idKey?: (keyof T & string) | ((row: T) => string | number);
    density?: 'compact' | 'balanced' | 'spacious';
    hasHover?: boolean;
    isStriped?: boolean;
    columns?: {
        key: string;
        header?: ReactNode;
        width?: ColumnWidth;
        align?: 'start' | 'center' | 'end';
        renderCell?: (row: T) => ReactNode;
    }[];
};

/** Displays data-driven rows without plugins or a second children-based table contract. */
export function Table<T extends Record<string, unknown>>(props: TableProps<T>) {
    // Use balanced rows without decorative striping or hover highlighting.
    return (
        <AstryxTable
            {...props}
            className={props.hidden ? 'hidden!' : undefined}
            density={props.density ?? 'balanced'}
            hasHover={props.hasHover ?? false}
            isStriped={props.isStriped ?? false}
        />
    );
}
