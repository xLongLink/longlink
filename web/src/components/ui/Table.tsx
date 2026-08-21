import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import {
    Table as AstryxTable,
    type TableColumn as AstryxTableColumn,
    type TableProps as AstryxTableProps,
} from '@astryxdesign/core/Table';

type TableRow = Record<string, unknown>;
type TableProps<Row extends TableRow> = Omit<AstryxTableProps<Row>, 'children' | 'columns' | 'data'> & {
    children?: ReactNode;
    data: Row[];
};
type TableColumnProps<Row extends TableRow> = Omit<AstryxTableColumn<Row>, 'key' | 'renderCell'> & {
    children?: (row: Row) => ReactNode;
    field: string;
    header: ReactNode;
};

/** Renders data using declarative TableColumn children. */
export function Table<Row extends TableRow>({ children, data, ...props }: TableProps<Row>) {
    const columns = Children.toArray(children)
        .filter(
            (child): child is ReactElement<TableColumnProps<Row>> => isValidElement(child) && child.type === TableColumn
        )
        .map((column) => {
            const { children: renderCell, field, ...columnProps } = column.props;

            return {
                ...columnProps,
                key: field,
                renderCell,
            };
        });

    return <AstryxTable {...props} columns={columns} data={data} />;
}

/** Defines a data field and optional rich cell content for a Table. */
export function TableColumn<Row extends TableRow>(_props: TableColumnProps<Row>) {
    return null;
}
