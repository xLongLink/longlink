import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks/use-api';
import { Info, Search, X } from 'lucide-react';
import { Stack } from '@/components/longlink/layout/stack';
import { useDeferredValue, useRef, useState } from 'react';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { DeletionDialog } from '@/components/dialogs/deletion';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Pagination } from '@/components/longlink/action/pagination';
import { ComputeMetadata } from '@/components/dialogs/compute-metadata';
import { ComputeRegistration } from '@/components/dialogs/compute-registration';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists registered Compute infrastructure and manages registration and removal. */
export default function Compute() {
    const [filters, setFilters] = useState({ search: '', page: 1 });
    const { search, page } = useDeferredValue(filters);
    const suffix = `?page=${page}&page_size=25&search=${encodeURIComponent(search.trim())}`;
    const searchInput = useRef<HTMLInputElement>(null);

    const [dialog, setDialog] = useState<
        | { kind: 'registration' }
        | { kind: 'metadata'; id: string }
        | { kind: 'deletion'; item: { id: string; name: string } }
        | null
    >(null);

    const path = `/api/v1/computes${suffix}`;
    const [computes, invalidate] = useApi(path, schemas.zPageComputeRegistryResponse);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = dialog?.kind === 'metadata' ? computes.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return (
        <Stack gap={2}>
            <title>Compute | LongLink</title>
            <Stack gap={0} direction="horizontal" justify="between" align="center" wrap="wrap">
                <h1 className="font-semibold tracking-tight text-4xl">Compute</h1>
                <Button onClick={() => setDialog({ kind: 'registration' })}>Register Compute</Button>
            </Stack>
            <Field>
                <FieldLabel htmlFor="search-compute">Search compute</FieldLabel>
                <InputGroup>
                    <InputGroupInput
                        ref={searchInput}
                        id="search-compute"
                        placeholder="Search by name or endpoint"
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
                                aria-label="Clear Search compute"
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
                            <TableHead>Compute</TableHead>
                            <TableHead align="end">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {computes.items.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <span>{row.name}</span>
                                        <span className="text-xs text-muted-foreground">{row.gateway_url}</span>
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
                        {computes.items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} align="center">
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
                        totalItems={computes.total}
                    />
                </footer>
            </Stack>
            {dialog?.kind === 'registration' && (
                <ComputeRegistration
                    onSuccess={async () => {
                        // Refresh the list before closing only this registration attempt.
                        await invalidate();
                        setDialog((current) => (current === dialog ? null : current));
                    }}
                    onOpenChange={() => {
                        // An obsolete registration cannot dismiss a replacement dialog selection.
                        setDialog((current) => (current === dialog ? null : current));
                    }}
                />
            )}
            {metadata && (
                <ComputeMetadata
                    metadata={metadata}
                    onClose={() => setDialog(null)}
                    onDelete={() => setDialog({ kind: 'deletion', item: { id: metadata.id, name: metadata.name } })}
                />
            )}
            {dialog?.kind === 'deletion' && (
                <DeletionDialog
                    confirmation={{
                        title: 'Delete compute',
                        description: `Remove compute ${dialog.item.name} from the LongLink Platform? Its Kubernetes resources will remain unchanged.`,
                        onDelete: async () => {
                            // Remove the registry entry without deleting its Kubernetes resources.
                            await api.delete(`/api/v1/computes/${dialog.item.id}`);
                            await invalidate();
                            setDialog((current) => (current === dialog ? null : current));
                        }
                    }}
                    onClose={() => setDialog(null)}
                />
            )}
        </Stack>
    );
}
