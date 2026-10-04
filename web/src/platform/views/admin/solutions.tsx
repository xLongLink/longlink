import type { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { useQueryClient } from '@tanstack/react-query';
import { useApi, useAction } from '@/lib/hooks/use-api';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { zPageSolutionResponse } from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists Solutions and manages administrator metadata and deletion dialogs. */
export default function Solutions() {
    const [page, setPage] = useState(1);
    const [dialog, setDialog] = useState<
        | { kind: 'metadata'; item: z.output<typeof zPageSolutionResponse>['items'][number] }
        | { kind: 'deletion'; item: { id: string; name: string } }
        | null
    >(null);
    const client = useQueryClient();
    const action = useAction();
    const path = `/api/v1/solutions?page=${page}&page_size=25`;
    const solutions = useApi(path, zPageSolutionResponse);

    return (
        <Stack gap={8}>
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
                                    <Text>{row.image_reference}</Text>
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
                                <MoreMenu
                                    alignment="end"
                                    items={[
                                        {
                                            id: 'metadata',
                                            label: 'Metadata',
                                            icon: <Info />,
                                            onClick: () => setDialog({ kind: 'metadata', item: row }),
                                        },
                                    ]}
                                />
                            ),
                        },
                    ]}
                />
                <Stack direction="horizontal" gap={2} justify="between">
                    <Button label="Previous" isDisabled={page === 1} onClick={() => setPage(page - 1)} />
                    <Button label="Next" isDisabled={solutions.total <= page * 25} onClick={() => setPage(page + 1)} />
                </Stack>
            </Stack>
            {dialog?.kind === 'metadata' && (
                <Dialog
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                >
                    <DialogHeader title="Solution metadata" onOpenChange={() => setDialog(null)} />
                    <Stack gap={2}>
                        <Text>
                            <b>Status</b> {dialog.item.status}
                        </Text>
                        <Text>
                            <b>Organization</b> {dialog.item.organization.name}
                        </Text>
                        <Text>
                            <b>Desired image</b> {dialog.item.image_desired}
                        </Text>
                        <Text>
                            <b>Desired revision</b> {dialog.item.desired_revision_id ?? 'Not selected'}
                        </Text>
                        <Text>
                            <b>Last deployed revision</b> {dialog.item.deployed_revision_id ?? 'Never deployed'}
                        </Text>
                        <Text>
                            <b>ID</b> {dialog.item.id}
                        </Text>
                        <Text>
                            <b>Slug</b> {dialog.item.slug}
                        </Text>
                        {dialog.item.description && (
                            <Text>
                                <b>Description</b> {dialog.item.description}
                            </Text>
                        )}
                        <Text>
                            <b>Created</b> {dialog.item.created_at}
                        </Text>
                        <Stack direction="horizontal" justify="end">
                            <Button
                                label="Delete"
                                variant="destructive"
                                onClick={() =>
                                    setDialog({
                                        kind: 'deletion',
                                        item: { id: dialog.item.id, name: dialog.item.name },
                                    })
                                }
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
            {dialog?.kind === 'deletion' && (
                <Dialog
                    isOpen
                    purpose="form"
                    onOpenChange={(open) => {
                        if (!open && !action.isPending) setDialog(null);
                    }}
                >
                    <DialogHeader
                        title="Delete solution"
                        onOpenChange={() => {
                            if (!action.isPending) setDialog(null);
                        }}
                    />
                    <Stack gap={3}>
                        <Text color="secondary">Delete solution {dialog.item.name}?</Text>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button
                                label="Cancel"
                                variant="ghost"
                                isDisabled={action.isPending}
                                onClick={() => setDialog(null)}
                            />
                            <Button
                                label="Delete"
                                variant="destructive"
                                isLoading={action.isPending}
                                onClick={() =>
                                    action.mutate(async () => {
                                        // Refresh the list only after deletion succeeds.
                                        await api.delete(`/api/v1/solutions/${dialog.item.id}`);
                                        await client.invalidateQueries({ queryKey: ['api', path], exact: true });
                                        setDialog(null);
                                    })
                                }
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
        </Stack>
    );
}
