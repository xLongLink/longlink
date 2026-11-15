import { api } from '@/lib/api';
import { useState } from 'react';
import { useAdminList } from './use-list';
import { Info, Search } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { TextInput } from '@/components/custom/text-input';
import { DeletionDialog } from '@/components/dialogs/deletion';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { DataPagination } from '@/components/custom/data-pagination';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { ComputeMetadata } from '@/components/dialogs/compute-metadata';
import { DataTable, proportional } from '@/components/custom/data-table';
import { NativeButton as Button } from '@/components/custom/native-button';
import { ComputeRegistration } from '@/components/dialogs/compute-registration';

/** Lists registered Compute infrastructure and manages registration and removal. */
export default function Compute() {
    const { search, pagination, suffix } = useAdminList();

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
                <Button label="Register Compute" onClick={() => setDialog({ kind: 'registration' })} />
            </Stack>
            <TextInput
                label="Search compute"
                placeholder="Search by name or endpoint"
                {...search}
                startIcon={<Search />}
            />
            <Stack gap={1}>
                <DataTable
                    data={computes.items}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'name',
                            header: 'Compute',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack align="start">
                                    <span>{row.name}</span>
                                    <span className="text-xs text-muted-foreground">{row.gateway_url}</span>
                                </Stack>
                            )
                        },
                        {
                            key: 'id',
                            header: 'Actions',
                            align: 'end',
                            width: proportional(0.5),
                            renderCell: (row) => (
                                <Button
                                    label="Metadata"
                                    icon={<Info />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDialog({ kind: 'metadata', id: row.id })}
                                />
                            )
                        }
                    ]}
                />
                <Stack as="footer" align="center" paddingBlock={2}>
                    <DataPagination {...pagination} totalItems={computes.total} />
                </Stack>
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
