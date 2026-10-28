import ViewLayout from './ViewLayout';
import { Table } from '@/components/ui/Table';

/** Documents Table in LongLink Views. */
export default function TablePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Table"
            introduction={'Displays data-driven rows without plugins or a second children-based table contract.'}
            properties={[
                {
                    name: 'data',
                    type: 'T[]',
                    description: 'Data objects displayed as rows.',
                },
                {
                    name: 'hasHover',
                    type: 'boolean',
                    description: 'Applies a hover highlight background to rows on pointer devices.',
                },
                {
                    name: 'isStriped',
                    type: 'boolean',
                    description: 'Applies a background wash to even-numbered rows.',
                },
                {
                    name: 'columns',
                    type: '{ key: string; header?: ReactNode; width?: ColumnWidth; align?: "start" | "center" | "end"; renderCell?: ((row: T) => ReactNode); }[]',
                    description: 'Columns with custom cells and proportional() or pixel() widths.',
                },
            ]}
            examples={[
                {
                    title: 'Table',
                    preview: <TableExample />,
                    code: `function Example() {
  return (
    <Table
      data={[{ id: '1', name: 'Order', status: 'Open' }]}
      columns={[
        { key: 'name', header: 'Name', width: proportional(2) },
        { key: 'status', header: 'Status', width: proportional(1) },
      ]}
    />
  );
}`,
                },
            ]}
        />
    );
}

/** Renders the page's table example for documentation and the catalog. */
export function TableExample() {
    // Display the sample order in compact, edge-to-edge rows.
    return (
        <Table
            data={[{ item: 'Order', status: 'Open' }]}
            columns={[
                { key: 'item', header: 'Item' },
                { key: 'status', header: 'Status' },
            ]}
        />
    );
}
