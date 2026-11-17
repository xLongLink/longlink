import { useState } from 'react';
import ViewLayout from './view-layout';
import { Pagination } from '@/components/longlink/action/pagination';

/** Documents controlled pagination in LongLink Views. */
export default function PaginationPage() {
    return (
        <ViewLayout
            name="Pagination"
            properties={[
                { name: 'page', type: 'number' },
                { name: 'pageSize', type: 'number' },
                { name: 'totalItems', type: 'number' },
                { name: 'onPageChange', type: '(page: number) => void' },
                { name: 'label', type: 'string' }
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
