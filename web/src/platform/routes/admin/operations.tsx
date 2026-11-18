import { useApi } from '@/lib/hooks/use-api';
import { Info, Search, X } from 'lucide-react';
import { Stack } from '@/components/longlink/layout/stack';
import { useDeferredValue, useRef, useState } from 'react';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { Pagination } from '@/components/longlink/action/pagination';
import { OperationMetadata } from '@/components/dialogs/operation-metadata';
import { zPageOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

const kinds = {
    'solution.deploy': 'Solution deployment',
    'solution.delete': 'Solution deletion',
    'organization.create': 'Organization creation',
    'organization.delete': 'Organization deletion'
};

const statuses = { scheduled: 'Planned', active: 'Active', completed: 'Completed', failed: 'Failed' };

/** Lists operation history and exposes its metadata. */
export default function Operations() {
    const [filters, setFilters] = useState({ search: '', page: 1 });
    const { search, page } = useDeferredValue(filters);
    const suffix = `?page=${page}&page_size=25&search=${encodeURIComponent(search.trim())}`;
    const searchInput = useRef<HTMLInputElement>(null);
    const [metadataId, setMetadataId] = useState<string | null>(null);

    const [operations] = useApi(`/api/v1/operations${suffix}`, zPageOperationResponse);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = operations.items.find((item) => item.id === metadataId);

    if (metadataId !== null && !metadata) setMetadataId(null);

    return (
        <Stack gap={2}>
            <title>Operations | LongLink</title>
            <h1 className="font-semibold tracking-tight text-4xl">Operations</h1>
            <Field>
                <FieldLabel htmlFor="search-operations">Search operations</FieldLabel>
                <InputGroup>
                    <InputGroupInput
                        ref={searchInput}
                        id="search-operations"
                        placeholder="Search by operation kind or resource name"
                        value={filters.search}
                        onChange={(event) => setFilters({ search: event.target.value, page: 1 })}
                    />
                    <InputGroupAddon aria-hidden="true">
                        <Search />
                    </InputGroupAddon>
                    {filters.search !== '' && (
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                size="icon-xs"
                                aria-label="Clear Search operations"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    setFilters({ search: '', page: 1 });
                                    searchInput.current?.focus({ preventScroll: true });
                                }}
                            >
                                <X aria-hidden="true" />
                            </InputGroupButton>
                        </InputGroupAddon>
                    )}
                </InputGroup>
            </Field>
            <Stack gap={1}>
                <Table wrap>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Operation</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead align="end">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {operations.items.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <span>{kinds[row.kind]}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {statuses[row.status]}
                                            {row.finished_at && ` - ${row.finished_at}`}
                                        </span>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <span>{row.resource_name ?? 'Resource unavailable'}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {row.kind.startsWith('solution.') ? 'Solution' : 'Organization'}
                                        </span>
                                    </Stack>
                                </TableCell>
                                <TableCell align="end">
                                    <Button size="sm" variant="ghost" onClick={() => setMetadataId(row.id)}>
                                        <Info aria-hidden="true" />
                                        Metadata
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {operations.items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} align="center">
                                    <Empty role="status" title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <footer className="flex flex-col items-center py-2">
                    <Pagination
                        page={filters.page}
                        pageSize={25}
                        onPageChange={(page) => setFilters({ ...filters, page })}
                        totalItems={operations.total}
                    />
                </footer>
            </Stack>
            {metadata && <OperationMetadata metadata={metadata} onOpenChange={() => setMetadataId(null)} />}
        </Stack>
    );
}
