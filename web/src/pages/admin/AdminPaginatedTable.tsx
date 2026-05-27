import * as React from 'react';

import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';

export type AdminTableColumn<Row> = {
    header: string;
    className?: string;
    render: (row: Row) => React.ReactNode;
};

type AdminPaginatedTableProps<Row> = {
    columns: Array<AdminTableColumn<Row>>;
    rows: Array<Row>;
    rowKey: (row: Row) => string;
    emptyMessage: string;
    isLoading?: boolean;
    errorMessage?: string | null;
    pageSize?: number;
};

/** Renders an admin table with client-side pagination controls. */
export default function AdminPaginatedTable<Row>({
    columns,
    rows,
    rowKey,
    emptyMessage,
    isLoading = false,
    errorMessage = null,
    pageSize = 5,
}: AdminPaginatedTableProps<Row>) {
    const [page, setPage] = React.useState(1);

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const visibleRows = rows.slice(startIndex, startIndex + pageSize);
    const rangeStart = rows.length === 0 ? 0 : startIndex + 1;
    const rangeEnd = startIndex + visibleRows.length;

    React.useEffect(() => {
        // Keep the active page inside the available range when the rows change.
        if (page !== currentPage) {
            setPage(currentPage);
        }
    }, [currentPage, page]);

    const showLoading = isLoading && rows.length === 0;
    const showError = Boolean(errorMessage) && rows.length === 0;
    const showPagination = !showLoading && !showError;

    return (
        <div className="space-y-4 rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
            <Table className="min-w-[760px]">
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column.header} className={column.className}>
                                {column.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {showLoading ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="py-8 text-sm text-muted-foreground">
                                Loading records...
                            </TableCell>
                        </TableRow>
                    ) : showError ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="py-8 text-sm text-destructive">
                                {errorMessage}
                            </TableCell>
                        </TableRow>
                    ) : visibleRows.length > 0 ? (
                        visibleRows.map((row) => (
                            <TableRow key={rowKey(row)}>
                                {columns.map((column) => (
                                    <TableCell key={column.header} className={column.className}>
                                        {column.render(row)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="py-8 text-sm text-muted-foreground">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {showPagination ? (
                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                        {rows.length === 0 ? 'No records' : `Showing ${rangeStart}-${rangeEnd} of ${rows.length}`}
                    </p>
                    <Pagination className="justify-end sm:w-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    aria-disabled={currentPage === 1}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        setPage((value) => Math.max(1, value - 1));
                                    }}
                                />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                                <PaginationItem key={pageNumber}>
                                    <PaginationLink
                                        href="#"
                                        isActive={pageNumber === currentPage}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            setPage(pageNumber);
                                        }}
                                    >
                                        {pageNumber}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    aria-disabled={currentPage === totalPages}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        setPage((value) => Math.min(totalPages, value + 1));
                                    }}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            ) : null}
        </div>
    );
}
