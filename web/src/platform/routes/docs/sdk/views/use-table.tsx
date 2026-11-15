import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents the View-aware TanStack table binding. */
export default function UseTablePage() {
    return (
        <ViewLayout
            name="useTable"
            properties={[
                { name: 'options', type: 'TableOptions<TFeatures, TData>' },
                { name: 'selector', type: '((state: TableState<TFeatures>) => TSelected) | undefined' },
                { name: 'return', type: 'ReactTable<TFeatures, TData, TSelected>' }
            ]}
        >
            <CodeBlock
                language="jsx"
                code={`const columns = [
  { accessorKey: 'name', header: 'Item' },
  { accessorKey: 'status', header: 'Status' }
];

export default function ItemsGrid() {
  const [items] = useApi('/api/items');
  const table = useTable({
    data: items,
    columns,
    features: dataGridFeatures
  });

  return (
    <DataGrid table={table} recordCount={items.length}>
      <DataGridContainer>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}`}
            >
                <CodeBlockCopyButton />
            </CodeBlock>
        </ViewLayout>
    );
}
