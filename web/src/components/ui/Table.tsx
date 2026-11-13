import type { TableColumn } from './table';
import { NativeTable } from './NativeTable';

export { proportional, pixel } from './table';

type TableProps<T extends Record<string, unknown>> = {
    data: T[];
    hasHover?: boolean;
    isStriped?: boolean;
    columns?: TableColumn<T>[];
};

/** Displays data-driven rows without plugins or a second children-based table contract. */
export function Table<T extends Record<string, unknown>>(props: TableProps<T>) {
    return (
        <NativeTable data={props.data} columns={props.columns} hasHover={props.hasHover} isStriped={props.isStriped} />
    );
}
