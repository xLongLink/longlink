import { useState } from 'react';
import ViewLayout from './view-layout';
import { Pagination } from '@/components/longlink/action/pagination';

/** Documents controlled pagination in LongLink Views. */
export default function PaginationPage() {
    return (
        <ViewLayout
            name="Pagination"
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
