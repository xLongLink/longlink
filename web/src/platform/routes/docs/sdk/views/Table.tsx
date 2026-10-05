import ViewLayout from './ViewLayout';
import { Table } from '@/components/ui/Table';

/** Documents Table in LongLink Views. */
export default function TablePage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Table"
            examples={[
                {
                    title: 'Table',
                    preview: <TableExample />,
                    code: `function Example() {
  return (
    <Table
      data={[{ id: '1', name: 'Order', status: 'Open' }]}
      idKey="id"
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
            density="compact"
            columns={[
                { key: 'item', header: 'Item' },
                { key: 'status', header: 'Status' },
            ]}
        />
    );
}
