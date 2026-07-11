import { type ColumnDef, type RowData, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const LEADING_PAGINATION_PAGE_COUNT = 5;

type PaginationItemValue = number | 'start-ellipsis' | 'end-ellipsis';

declare module '@tanstack/react-table' {
    interface ColumnMeta<TData extends RowData, TValue> {
        className?: string;
    }
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    emptyMessage?: string;
    error?: Error | null;
    isLoading?: boolean;
    pageSize?: number;
}

/** Returns visible page numbers and ellipses for compact data table pagination. */
function getPaginationItems(currentPage: number, pageCount: number): PaginationItemValue[] {
    // Show every page when the range is already short.
    if (pageCount <= LEADING_PAGINATION_PAGE_COUNT + 1) {
        return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    // Keep the first pages expanded near the beginning.
    if (currentPage <= LEADING_PAGINATION_PAGE_COUNT) {
        return [1, 2, 3, 4, 5, 'end-ellipsis', pageCount];
    }

    const middlePages = [currentPage - 1, currentPage, currentPage + 1].filter((page) => page > 1 && page < pageCount);
    const lastMiddlePage = middlePages.at(-1) ?? 1;
    const items: PaginationItemValue[] = [1, 'start-ellipsis', ...middlePages];

    // Keep the current page centered while preserving direct links to the first and last page.
    if (lastMiddlePage < pageCount - 1) {
        items.push('end-ellipsis');
    }

    items.push(pageCount);
    return items;
}

/** Renders a shadcn-style data table. */
export function DataTable<TData, TValue>({
    columns,
    data,
    emptyMessage,
    error = null,
    isLoading = false,
    pageSize,
}: DataTableProps<TData, TValue>) {
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(1);
    const pageCount = pageSize ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;
    const safeCurrentPage = Math.min(currentPage, pageCount);
    const paginatedData = pageSize ? data.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize) : data;
    const paginationItems = getPaginationItems(safeCurrentPage, pageCount);
    const showPagination = Boolean(pageSize && pageCount > 1);
    const table = useReactTable({
        data: paginatedData,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });
    const resolvedEmptyMessage = emptyMessage ?? t('common.noResults');

    useEffect(() => {
        // Clamp the selected page after data size changes.
        if (currentPage > pageCount) {
            setCurrentPage(pageCount);
        }
    }, [currentPage, pageCount]);

    // Avoid showing an empty table while initial data loads.
    if (isLoading && data.length === 0) {
        return null;
    }

    // Surface errors when there is no data to show.
    if (error && data.length === 0) {
        return <div className="rounded-md border p-4 text-sm text-destructive">{error.message}</div>;
    }

    return (
        <div className="space-y-3">
            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn('bg-muted/50', header.column.columnDef.meta?.className)}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {resolvedEmptyMessage}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {showPagination ? (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                text={t('actions.previous')}
                                aria-disabled={safeCurrentPage === 1}
                                tabIndex={safeCurrentPage === 1 ? -1 : undefined}
                                className={cn(safeCurrentPage === 1 && 'pointer-events-none opacity-50')}
                                onClick={(event) => {
                                    event.preventDefault();
                                    setCurrentPage(Math.max(1, safeCurrentPage - 1));
                                }}
                            />
                        </PaginationItem>
                        {paginationItems.map((item) => (
                            <PaginationItem key={item}>
                                {typeof item === 'number' ? (
                                    <PaginationLink
                                        href="#"
                                        isActive={item === safeCurrentPage}
                                        aria-label={`Go to page ${item}`}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            setCurrentPage(item);
                                        }}
                                    >
                                        {item}
                                    </PaginationLink>
                                ) : (
                                    <PaginationEllipsis />
                                )}
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                text={t('actions.next')}
                                aria-disabled={safeCurrentPage === pageCount}
                                tabIndex={safeCurrentPage === pageCount ? -1 : undefined}
                                className={cn(safeCurrentPage === pageCount && 'pointer-events-none opacity-50')}
                                onClick={(event) => {
                                    event.preventDefault();
                                    setCurrentPage(Math.min(pageCount, safeCurrentPage + 1));
                                }}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            ) : null}
        </div>
    );
}
