import { api } from '@/lib/api';
import { useRef, useState } from 'react';
import { useAdminList } from './use-list';
import { useApi } from '@/lib/hooks/use-api';
import { Info, Search, X } from 'lucide-react';
import { Button } from '@/components/longlink/action/button';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { DeletionDialog } from '@/components/dialogs/deletion';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Pagination } from '@/components/longlink/action/pagination';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { ComputeMetadata } from '@/components/dialogs/compute-metadata';
import { ComputeRegistration } from '@/components/dialogs/compute-registration';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists registered Compute infrastructure and manages registration and removal. */
export default function Compute() {
    const { search, pagination, suffix } = useAdminList();
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
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
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
                        value={search.value}
                        onChange={(event) => search.onChange(event.target.value)}
                    />
                    <InputGroupAddon aria-hidden="true">
                        <Search />
                    </InputGroupAddon>
                    {search.value !== '' && (
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                size="icon-xs"
                                aria-label="Clear Search compute"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    search.onChange('');
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
                                    <Stack align="start">
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
                    <Pagination {...pagination} totalItems={computes.total} />
                </footer>
            </Stack>
            {dialog?.kind === 'registration' && (
                <ComputeRegistration
                    onSuccess={async () => {
                        // Refresh the list before closing only this registration attempt.
                        await invalidate();
                        setDialog((current) => (current === dialog ? null : current));
                    }}
                    onClose={() => {
                        // An obsolete registration cannot dismiss a replacement dialog selection.
                        setDialog((current) => (current === dialog ? null : current));
                    }}
                />
            )}
            {metadata && (
                <ComputeMetadata
                    open
                    metadata={metadata}
                    onOpenChange={() => setDialog(null)}
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
import { Empty } from '@/components/longlink/display/empty';
