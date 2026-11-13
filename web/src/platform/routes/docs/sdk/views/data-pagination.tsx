import { useState } from 'react';
import ViewLayout from './view-layout';
import { DataPagination } from '@/components/custom/data-pagination';

/** Documents shared pagination for Solution tables and galleries. */
export default function DataPaginationPage() {
    // Keep server queries and selected-page state in the Solution while sharing navigation controls.
    return (
        <ViewLayout
            name="DataPagination"
            properties={[
                { name: 'page', type: 'number', description: 'Current page number, starting at 1.' },
                {
                    name: 'onPageChange',
                    type: '(page: number) => void',
                    description: 'Receives the selected page number.'
                },
                {
                    name: 'totalItems',
                    type: 'number',
                    description: 'Total item count used to calculate pages, overriding totalPages.'
                },
                {
                    name: 'pageSize',
                    type: 'number',
                    description:
                        'Number of items per page. Coerced to a positive integer; non-finite values fall back to the default.'
                },
                { name: 'label', type: 'string', description: 'Accessible navigation label; defaults to Pagination.' }
            ]}
            example={{
                title: 'Server pagination',
                preview: <DataPaginationExample />,
                code: `export default function Items() {
  const [page, setPage] = useState(1);
  const [items] = useApi(\`/api/items?page=\${page}&page_size=8\`);

  return (
    <Stack gap={4}>
      <DataTable data={items.items} />
      <DataPagination page={page} onPageChange={setPage} totalItems={items.total} pageSize={8} />
    </Stack>
  );
}`
            }}
        />
    );
}

/** Demonstrates controlled pagination without network requests. */
export function DataPaginationExample() {
    // Let the shared controls own page bounds while retaining the selected page locally.
    const [page, setPage] = useState(1);

    return <DataPagination page={page} onPageChange={setPage} totalItems={80} pageSize={8} />;
}
