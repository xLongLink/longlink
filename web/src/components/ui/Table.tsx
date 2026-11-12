import type { ReactNode } from 'react';
import { Table as AstryxTable, type ColumnWidth } from '@/components/astryx/Table';

export { proportional, pixel } from '@/components/astryx/Table';

type TableProps<T extends Record<string, unknown>> = {
    data: T[];
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
    // Use compact rows without decorative striping or hover highlighting.
    return (
        <AstryxTable
            {...props}
            density="compact"
            hasHover={props.hasHover ?? false}
            isStriped={props.isStriped ?? false}
        />
    );
}
