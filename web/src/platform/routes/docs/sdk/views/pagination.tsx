import { useState } from 'react';
import ViewLayout from './view-layout';
import { Pagination } from '@/components/longlink/action/pagination';

/** Documents controlled pagination in LongLink Views. */
export default function PaginationPage() {
    return (
        <ViewLayout
            name="Pagination"
            properties={[
                { name: 'page', type: 'number', description: 'Current page number, starting at 1.' },
                {
                    name: 'pageSize',
                    type: 'number',
                    description: 'Items per page. Coerced to a positive integer; non-finite values fall back to 10.'
                },
                {
                    name: 'totalItems',
                    type: 'number',
                    description: 'Total item count. Empty or non-finite totals render no pagination.'
                },
                {
                    name: 'onPageChange',
                    type: '(page: number) => void',
                    description: 'Receives the selected page number. Data loading and slicing remain in the View.'
                },
                { name: 'label', type: 'string', description: 'Accessible navigation label. Defaults to Pagination.' }
            ]}
            example={{
                title: 'Controlled pagination',
                preview: <PaginationExample />,
                code: `function Example() {
  const [page, setPage] = useState(1);

  return (
    <Pagination
      page={page}
      pageSize={10}
      totalItems={100}
      onPageChange={setPage}
    />
  );
}`
            }}
        />
    );
}

/** Keeps the selected page in the owning View. */
export function PaginationExample() {
    const [page, setPage] = useState(1);

    return <Pagination page={page} pageSize={10} totalItems={100} onPageChange={setPage} />;
}
