import { api } from '@/lib/api';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { NoIndex } from '@/components/NoIndex';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Table, proportional } from '@astryxdesign/core/Table';
import { DeletionDialog } from '@/platform/components/Deletion';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { zPageOrganizationIdentity } from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists organizations and confirms administrator deletion. */
export default function Organizations() {
    const [page, setPage] = useState(1);

    const [dialog, setDialog] = useState<
        { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null
    >(null);

    const [organizations, invalidate] = useApi(
        `/api/v1/organizations?page=${page}&page_size=25`,
        zPageOrganizationIdentity
    );

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata =
        dialog?.kind === 'metadata' ? organizations.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return (
        <Stack gap={4}>
            <NoIndex title="Organizations | LongLink" />
            <Heading level={1}>Organizations</Heading>
            <Stack gap={1}>
                <Table
                    data={organizations.items}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'name',
                            header: 'Name',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack direction="horizontal" gap={3} align="center">
                                    <Avatar kind="organization" name={row.name} />
                                    <Stack align="start">
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Link href={`/orgs/${row.slug}`}>{row.name}</Link>
                                            {row.status !== 'running' && (
                                                <Badge
                                                    label={row.status === 'creating' ? 'Creating' : 'Failed'}
                                                    variant={row.status === 'creating' ? 'info' : 'error'}
                                                />
                                            )}
                                        </Stack>
                                        <Text type="supporting">Organization</Text>
                                    </Stack>
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
                <Pagination
                    page={page}
                    onChange={setPage}
                    totalItems={organizations.total}
                    pageSize={25}
                    variant="none"
                />
            </Stack>
            {metadata && (
                <Dialog
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                >
                    <DialogHeader title="Organization metadata" onOpenChange={() => setDialog(null)} />
                    <Stack gap={2}>
                        <Text>
                            <b>Status</b> {metadata.status}
                        </Text>
                        <Text>
                            <b>Slug</b> {metadata.slug}
                        </Text>
                        <Text>
                            <b>ID</b> {metadata.id}
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
            <DeletionDialog
                confirmation={
                    dialog?.kind === 'deletion'
                        ? {
                              title: 'Delete organization',
                              description: `Delete organization ${dialog.item.name}?`,
                              onDelete: async () => {
                                  // Refresh the list only after deletion succeeds.
                                  await api.delete(`/api/v1/organizations/${dialog.item.id}`);
                                  await invalidate();
                                  setDialog(null);
                              },
                          }
                        : null
                }
                onClose={() => setDialog(null)}
            />
        </Stack>
    );
}
