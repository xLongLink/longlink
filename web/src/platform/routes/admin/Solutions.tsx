import type { z } from 'zod';
import { api } from '@/lib/api';
import { Info } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { NoIndex } from '@/components/NoIndex';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useState, useTransition } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Pagination } from '@astryxdesign/core/Pagination';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import type { zPageSolutionResponse } from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists Solutions and manages administrator metadata and deletion dialogs. */
export default function Solutions() {
    const [page, setPage] = useState(1);
    const [isDeleting, startDeletion] = useTransition();
    const [dialog, setDialog] = useState<
        { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null
    >(null);
    const [solutions, invalidate] = useApi<z.output<typeof zPageSolutionResponse>>(
        `/api/v1/solutions?page=${page}&page_size=25`
    );

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = dialog?.kind === 'metadata' ? solutions.items.find((item) => item.id === dialog.id) : undefined;
    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return (
        <Stack gap={4}>
            <NoIndex title="Solutions | LongLink" />
            <Heading level={1}>Solutions</Heading>
            <Stack gap={1}>
                <Table
                    data={solutions.items}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'name',
                            header: 'Solution',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack align="start">
                                    <Stack direction="horizontal" gap={1} align="center">
                                        <Link href={`/orgs/${row.organization.slug}/solutions/${row.slug}`}>
                                            {row.name}
                                        </Link>
                                        {row.status !== 'running' && (
                                            <Badge
                                                label={row.status === 'creating' ? 'Creating' : 'Failed'}
                                                variant={row.status === 'creating' ? 'info' : 'error'}
                                            />
                                        )}
                                    </Stack>
                                    {row.description && <Text type="supporting">{row.description}</Text>}
                                </Stack>
                            ),
                        },
                        {
                            key: 'organization',
                            header: 'Organization',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack direction="horizontal" gap={3} align="center">
                                    <Avatar shape="rounded" name={row.organization.name} />
                                    <Stack align="start">
                                        <Link href={`/orgs/${row.organization.slug}`}>{row.organization.name}</Link>
                                        <Text type="supporting">Organization</Text>
                                    </Stack>
                                </Stack>
                            ),
                        },
                        {
                            key: 'image_desired',
                            header: 'Image',
                            width: proportional(2),
                            renderCell: (row) => (
                                <Stack align="start">
                                    <Text>
                                        {row.image_desired.replace(/@sha256:[a-f0-9]{5,}([a-f0-9]{4})$/, '@sha25...$1')}
                                    </Text>
                                    <Text type="supporting">Revision: {row.desired_revision_id ?? 'Not selected'}</Text>
                                </Stack>
                            ),
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
                            ),
                        },
                    ]}
                />
                <Pagination page={page} onChange={setPage} totalItems={solutions.total} pageSize={25} variant="none" />
            </Stack>
            {metadata && (
                <Dialog
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                >
                    <DialogHeader title="Solution metadata" onOpenChange={() => setDialog(null)} />
                    <Stack gap={2}>
                        <Text>
                            <b>Status</b> {metadata.status}
                        </Text>
                        <Text>
                            <b>Organization</b> {metadata.organization.name}
                        </Text>
                        <Text>
                            <b>Desired image</b> {metadata.image_desired}
                        </Text>
                        <Text>
                            <b>Desired revision</b> {metadata.desired_revision_id ?? 'Not selected'}
                        </Text>
                        <Text>
                            <b>Last deployed revision</b> {metadata.deployed_revision_id ?? 'Never deployed'}
                        </Text>
                        <Text>
                            <b>ID</b> {metadata.id}
                        </Text>
                        <Text>
                            <b>Slug</b> {metadata.slug}
                        </Text>
                        {metadata.description && (
                            <Text>
                                <b>Description</b> {metadata.description}
                            </Text>
                        )}
                        <Text>
                            <b>Created</b> {metadata.created_at}
                        </Text>
                        <Stack direction="horizontal" justify="end">
                            <Button
                                label="Delete"
                                variant="destructive"
                                onClick={() =>
                                    setDialog({
                                        kind: 'deletion',
                                        item: { id: metadata.id, name: metadata.name },
                                    })
                                }
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
            {dialog?.kind === 'deletion' && (
                <AlertDialog
                    isOpen
                    title="Delete solution"
                    description={`Delete solution ${dialog.item.name}?`}
                    actionLabel="Delete"
                    isActionLoading={isDeleting}
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                    onAction={() =>
                        startDeletion(async () => {
                            // Refresh the list only after deletion succeeds.
                            await api.delete(`/api/v1/solutions/${dialog.item.id}`);
                            await invalidate();
                            setDialog(null);
                        })
                    }
                />
            )}
        </Stack>
    );
}
