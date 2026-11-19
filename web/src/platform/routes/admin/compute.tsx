import { api } from '@/lib/api';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { useListControls } from './use-list-controls';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Pagination } from '@/components/longlink/action/pagination';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';
import { ComputeRegistration } from '@/platform/routes/admin/dialogs/compute-registration';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists registered Compute infrastructure and manages registration and removal. */
export default function Compute() {
    const { suffix, searchField, pagination } = useListControls('compute', 'Search by name or endpoint');

    const [dialog, setDialog] = useState<{ kind: 'registration' } | { kind: 'metadata'; id: string } | null>(null);
    const confirmation = useConfirm();

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
            {searchField}
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
                    onOpenChange={() => {
                        // An obsolete registration cannot dismiss a replacement dialog selection.
                        setDialog((current) => (current === dialog ? null : current));
                    }}
                />
            )}
            {metadata && (
                <Dialog
                    open
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                    title="Compute metadata"
                    footer={
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                setDialog(null);
                                confirmation.show({
                                    title: 'Delete compute',
                                    description: `Remove compute ${metadata.name} from the LongLink Platform? Its Kubernetes resources will remain unchanged.`,
                                    actionLabel: 'Delete',
                                    actionVariant: 'destructive',
                                    onAction: async () => {
                                        await api.delete(`/api/v1/computes/${metadata.id}`);
                                        await invalidate();
                                    }
                                });
                            }}
                        >
                            Delete
                        </Button>
                    }
                >
                    <Stack gap={2}>
                        <span>
                            <b>Gateway</b> {metadata.gateway_url}
                        </span>
                        <span>
                            <b>Database storage class</b> {metadata.database_storage_class}
                        </span>
                        <span>
                            <b>ID</b> {metadata.id}
                        </span>
                        <span>
                            <b>Storage endpoint</b> {metadata.storage_endpoint}
                        </span>
                    </Stack>
                </Dialog>
            )}
            {confirmation.element}
        </Stack>
    );
}
