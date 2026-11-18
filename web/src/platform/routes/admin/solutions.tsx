import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks/use-api';
import { Info, Search, X } from 'lucide-react';
import { Stack } from '@/components/longlink/layout/stack';
import { useDeferredValue, useRef, useState } from 'react';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Avatar } from '@/components/longlink/display/avatar';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { DeletionDialog } from '@/components/dialogs/deletion';
import { NativeLink as Link } from '@/components/custom/native-link';
import { Pagination } from '@/components/longlink/action/pagination';
import { SolutionMetadata } from '@/components/dialogs/solution-metadata';
import { zPageSolutionResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists Solutions and manages administrator metadata and deletion dialogs. */
export default function Solutions() {
    const [filters, setFilters] = useState({ search: '', page: 1 });
    const { search, page } = useDeferredValue(filters);
    const suffix = `?page=${page}&page_size=25&search=${encodeURIComponent(search.trim())}`;
    const searchInput = useRef<HTMLInputElement>(null);
    const [dialog, setDialog] = useState<
        { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null
    >(null);

    const [solutions, invalidate] = useApi(`/api/v1/solutions${suffix}`, zPageSolutionResponse);

    // Forget missing metadata while retaining the captured identity of a pending deletion.
    const metadata = dialog?.kind === 'metadata' ? solutions.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);
    const deletion = dialog?.kind === 'deletion' ? dialog.item : null;

    return (
        <Stack gap={2}>
            <title>Solutions | LongLink</title>
            <h1 className="font-semibold tracking-tight text-4xl">Solutions</h1>
            <Field>
                <FieldLabel htmlFor="search-solutions">Search solutions</FieldLabel>
                <InputGroup>
                    <InputGroupInput
                        ref={searchInput}
                        id="search-solutions"
                        placeholder="Search by name, description, or organization"
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
                                aria-label="Clear Search solutions"
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
                            <TableHead>Solution</TableHead>
                            <TableHead>Organization</TableHead>
                            <TableHead>Image</TableHead>
                            <TableHead align="end">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {solutions.items.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Link href={`/orgs/${row.organization.id}/solutions/${row.id}`}>
                                                {row.name}
                                            </Link>
                                            {row.status !== 'running' && (
                                                <span
                                                    className={
                                                        row.status === 'creating'
                                                            ? 'text-xs text-info-foreground'
                                                            : 'text-xs text-destructive-foreground'
                                                    }
                                                >
                                                    {row.status === 'creating' ? 'Creating' : 'Failed'}
                                                </span>
                                            )}
                                        </Stack>
                                        {row.description && (
                                            <span className="text-xs text-muted-foreground">{row.description}</span>
                                        )}
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Stack direction="horizontal" gap={3} align="center">
                                        <Avatar shape="rounded" name={row.organization.name} />
                                        <Stack gap={0} align="start">
                                            <Link href={`/orgs/${row.organization.id}`}>{row.organization.name}</Link>
                                            <span className="text-xs text-muted-foreground">Organization</span>
                                        </Stack>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <span>
                                            {row.image_desired.replace(
                                                /@sha256:[a-f0-9]{5,}([a-f0-9]{4})$/,
                                                '@sha25...$1'
                                            )}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Revision: {row.desired_revision_id ?? 'Not selected'}
                                        </span>
                                    </Stack>
                                </TableCell>
                                <TableCell align="end">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setDialog({ kind: 'metadata', id: row.id })}
                                    >
                                        <Info aria-hidden="true" />
                                        Metadata
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {solutions.items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
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
                        totalItems={solutions.total}
                    />
                </footer>
            </Stack>
            {metadata && (
                <SolutionMetadata
                    metadata={metadata}
                    onOpenChange={() => setDialog(null)}
                    onDelete={() => setDialog({ kind: 'deletion', item: { id: metadata.id, name: metadata.name } })}
                />
            )}
            <DeletionDialog
                confirmation={
                    deletion
                        ? {
                              title: 'Delete solution',
                              description: `Delete solution ${deletion.name}?`,
                              onDelete: async () => {
                                  // Refresh the list only after deletion succeeds.
                                  await api.delete(`/api/v1/solutions/${deletion.id}`);
                                  await invalidate();
                                  setDialog(null);
                              }
                          }
                        : null
                }
                onClose={() => setDialog(null)}
            />
        </Stack>
    );
}
