import ViewLayout from './view-layout';
import { useMemo, useState } from 'react';
import { useTable, type ColumnDef } from '@/components/longlink/hooks/use-table';
import catalog from '../../../../../../../sdk/longlink/.static/jsx/components.json';
import {
    Box,
    Button,
    DataGrid,
    DataGridColumnHeader,
    DataGridPagination,
    DataGridScrollArea,
    DataGridTable,
    Empty,
    Frame,
    Input,
    dataGridFeatures,
    type DataGridFeatures
} from '@/components/longlink';

const files = [
    { name: 'purchase-order-871.pdf', type: 'PDF' },
    { name: 'invoice-1042.pdf', type: 'PDF' },
    { name: 'delivery-note-239.pdf', type: 'PDF' },
    { name: 'inventory.csv', type: 'CSV' },
    { name: 'pricing.xlsx', type: 'XLSX' },
    { name: 'product-photo.webp', type: 'WEBP' }
];

const columns: ColumnDef<DataGridFeatures, (typeof files)[number]>[] = [
    { accessorKey: 'name', header: ({ column }) => <DataGridColumnHeader column={column} title="File" /> },
    { accessorKey: 'type', header: 'Type' }
];

/** Documents Frame composition using the SDK's searchable table layout. */
export default function FramePage() {
    const component = catalog.components.find((entry) => entry.name === 'Frame');

    return (
        <ViewLayout
            name="Frame"
            properties={component?.properties ?? []}
            example={{
                title: 'Files',
                preview: <FrameExample />,
                code: `const files = [
  { name: 'purchase-order-871.pdf', type: 'PDF' },
  { name: 'invoice-1042.pdf', type: 'PDF' },
  { name: 'delivery-note-239.pdf', type: 'PDF' },
  { name: 'inventory.csv', type: 'CSV' },
  { name: 'pricing.xlsx', type: 'XLSX' },
  { name: 'product-photo.webp', type: 'WEBP' },
];

function Example() {
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
  const term = search.trim().toLowerCase();
  const data = useMemo(() => files.filter((file) => file.name.includes(term)), [term]);
  const columns = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataGridColumnHeader column={column} title="File" />,
    },
    { accessorKey: 'type', header: 'Type' },
  ];
  const table = useTable({
    features: dataGridFeatures,
    data,
    columns,
    getRowId: (file) => file.name,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  function changeSearch(value) {
    setSearch(value);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  return (
    <Box width="100%" maxWidth={640}>
      <DataGrid
        table={table}
        recordCount={data.length}
        tableLayout={{ dense: true, headerBackground: false, rowBorder: true }}
        emptyMessage={
          <Empty title="No files found">
            <Button size="sm" variant="outline" onClick={() => changeSearch('')}>Clear search</Button>
          </Empty>
        }
      >
        <Frame
          variant="ghost"
          stacked
          dense
          spacing="sm"
          padding="none"
          action={
            <Input
              aria-label="Search files"
              placeholder="Search files"
              value={search}
              onChange={(event) => changeSearch(event.currentTarget.value)}
            />
          }
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

/** Keeps search and pagination caller-owned while Frame arranges the grid. */
export function FrameExample() {
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const term = search.trim().toLowerCase();
    const data = useMemo(() => files.filter((file) => file.name.includes(term)), [term]);
    const table = useTable({
        features: dataGridFeatures,
        data,
        columns,
        getRowId: (file) => file.name,
        state: { pagination },
        onPaginationChange: setPagination
    });

    function changeSearch(value: string) {
        setSearch(value);
        setPagination((current) => ({ ...current, pageIndex: 0 }));
    }

    return (
        <Box width="100%" maxWidth={640}>
            <DataGrid
                table={table}
                recordCount={data.length}
                tableLayout={{ dense: true, headerBackground: false, rowBorder: true }}
                emptyMessage={
                    <Empty title="No files found">
                        <Button size="sm" variant="outline" onClick={() => changeSearch('')}>
                            Clear search
                        </Button>
                    </Empty>
                }
            >
                <Frame
                    variant="ghost"
                    stacked
                    dense
                    spacing="sm"
                    padding="none"
                    action={
                        <Input
                            aria-label="Search files"
                            placeholder="Search files"
                            value={search}
                            onChange={(event) => changeSearch(event.currentTarget.value)}
                        />
                    }
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
