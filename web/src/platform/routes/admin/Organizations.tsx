import { api } from '@/lib/api';
import { useState } from 'react';
import { useAdminList } from './use-list';
import { Info, Search } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog } from '@/components/ui/Dialog';
import { TextInput } from '@/components/ui/TextInput';
import { DeletionDialog } from '@/components/Deletion';
import { Pagination } from '@/components/ui/Pagination';
import { NativeLink as Link } from '@/components/ui/NativeLink';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { NativeButton as Button } from '@/components/ui/NativeButton';
import { DataTable, proportional } from '@/components/custom/DataTable';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';
import { zPageOrganizationIdentity } from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists organizations and confirms administrator deletion. */
export default function Organizations() {
    const { search, pagination, suffix } = useAdminList();

    const [dialog, setDialog] = useState<
        { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null
    >(null);

    const [organizations, invalidate] = useApi(`/api/v1/organizations${suffix}`, zPageOrganizationIdentity);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata =
        dialog?.kind === 'metadata' ? organizations.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return (
        <Stack gap={2}>
            <title>Organizations | LongLink</title>
            <Heading level={1}>Organizations</Heading>
            <TextInput label="Search organizations" placeholder="Search by name" {...search} startIcon={<Search />} />
            <Stack gap={1}>
                <DataTable
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
                                            <Link href={`/orgs/${row.id}`}>{row.name}</Link>
                                            {row.status !== 'running' && (
                                                <Badge
                                                    variant={
                                                        row.status === 'creating' ? 'info-light' : 'destructive-light'
                                                    }
                                                >
                                                    {row.status === 'creating' ? 'Creating' : 'Failed'}
                                                </Badge>
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
                <Stack as="footer" align="center" paddingBlock={2}>
                    <Pagination {...pagination} totalItems={organizations.total} />
                </Stack>
            </Stack>
            {metadata && (
                <Dialog
                    title="Organization metadata"
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                >
                    <Stack gap={2} padding={8}>
                        <Text>
                            <b>Status</b> {metadata.status}
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
