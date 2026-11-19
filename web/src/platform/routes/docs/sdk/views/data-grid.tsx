import ViewLayout from './view-layout';
import {
    Box,
    Frame,
    useTable,
    dataGridFeatures,
    type DataGridFeatures,
    type ColumnDef,
    DataGrid,
    DataGridTable,
    DataGridColumnHeader,
    DataGridPagination,
    DataGridScrollArea,
    DataGridTableRowSelect,
    DataGridTableRowSelectAll
} from '@/components/longlink';

const files = [
    { id: 'po-871', name: 'purchase-order-871.pdf', type: 'PDF' },
    { id: 'inv-1042', name: 'invoice-1042.pdf', type: 'PDF' },
    { id: 'delivery-239', name: 'delivery-note-239.pdf', type: 'PDF' },
    { id: 'inventory', name: 'inventory.csv', type: 'CSV' },
    { id: 'pricing', name: 'pricing.xlsx', type: 'XLSX' },
    { id: 'photo', name: 'product-photo.webp', type: 'WEBP' }
];

const columns: ColumnDef<DataGridFeatures, (typeof files)[number]>[] = [
    {
        id: 'selection',
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        enableSorting: false
    },
    { accessorKey: 'name', header: ({ column }) => <DataGridColumnHeader column={column} title="File" /> },
    { accessorKey: 'type', header: ({ column }) => <DataGridColumnHeader column={column} title="Type" /> }
];

/** Documents the LongLink grid and its table-state companion components. */
export default function DataGridPage() {
    return (
        <ViewLayout
            name="DataGrid"
            example={{
                title: 'Sorting, selection, and pagination',
                preview: <DataGridExample />,
                code: `const files = [
  { id: 'po-871', name: 'purchase-order-871.pdf', type: 'PDF' },
  { id: 'inv-1042', name: 'invoice-1042.pdf', type: 'PDF' },
  { id: 'delivery-239', name: 'delivery-note-239.pdf', type: 'PDF' },
  { id: 'inventory', name: 'inventory.csv', type: 'CSV' },
  { id: 'pricing', name: 'pricing.xlsx', type: 'XLSX' },
  { id: 'photo', name: 'product-photo.webp', type: 'WEBP' },
];

const columns = [
  {
    id: 'selection',
    header: () => <DataGridTableRowSelectAll />,
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataGridColumnHeader column={column} title="File" />,
  },
  {
    accessorKey: 'type',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
  },
];

function Example() {
  const table = useTable({
    features: dataGridFeatures,
    data: files,
    columns,
    getRowId: (file) => file.id,
    enableRowSelection: true,
    initialState: { pagination: { pageIndex: 0, pageSize: 5 } },
  });

  return (
    <Box width="100%" maxWidth={640}>
      <DataGrid
        table={table}
        recordCount={files.length}
        tableLayout={{ dense: true, headerBackground: false, rowBorder: true }}
        emptyMessage="No files"
      >
        <Frame
          variant="ghost"
          dense
          spacing="sm"
          padding="none"
          footer={<DataGridPagination sizes={[5, 10]} />}
        >
          <DataGridScrollArea orientation="horizontal">
            <DataGridTable />
          </DataGridScrollArea>
        </Frame>
      </DataGrid>
    </Box>
  );
}`
            }}
        />
    );
}

/** Keeps selection on stable file IDs while table sorting and pagination change. */
export function DataGridExample() {
    const table = useTable({
        features: dataGridFeatures,
        data: files,
        columns,
        getRowId: (file) => file.id,
        enableRowSelection: true,
        initialState: { pagination: { pageIndex: 0, pageSize: 5 } }
    });

    return (
        <Box width="100%" maxWidth={640}>
            <DataGrid
                table={table}
                recordCount={files.length}
                tableLayout={{ dense: true, headerBackground: false, rowBorder: true }}
                emptyMessage="No files"
            >
                <Frame
                    variant="ghost"
                    dense
                    spacing="sm"
                    padding="none"
                    footer={<DataGridPagination sizes={[5, 10]} />}
                >
                    <DataGridScrollArea orientation="horizontal">
                        <DataGridTable />
                    </DataGridScrollArea>
                </Frame>
            </DataGrid>
        </Box>
    );
}
