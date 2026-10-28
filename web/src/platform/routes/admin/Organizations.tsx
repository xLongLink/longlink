import { api } from '@/lib/api';
import { Info, Search } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useDeferredValue, useState } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@/components/ui/TextInput';
import { DeletionDialog } from '@/components/Deletion';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Table, proportional } from '@astryxdesign/core/Table';
import { zPageOrganizationIdentity } from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists organizations and confirms administrator deletion. */
export default function Organizations() {
    // Defer list requests so typing remains responsive while a new page loads.
    const [filters, setFilters] = useState({ search: '', page: 1 });
    const { search, page } = useDeferredValue(filters);

    const [dialog, setDialog] = useState<
        { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null
    >(null);

    const [organizations, invalidate] = useApi(
        `/api/v1/organizations?page=${page}&page_size=25&search=${encodeURIComponent(search.trim())}`,
        zPageOrganizationIdentity
    );

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata =
        dialog?.kind === 'metadata' ? organizations.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return (
        <Stack gap={2}>
            <title>Organizations | LongLink</title>
            <Heading level={1}>Organizations</Heading>
            <TextInput
                label="Search organizations"
                placeholder="Search by name or slug"
                value={filters.search}
                startIcon={<Search />}
                onChange={(search) => setFilters({ search, page: 1 })}
            />
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
                <Stack as="footer" align="center" paddingBlock={2}>
                    <Pagination
                        page={page}
                        onChange={(page) => setFilters({ ...filters, page })}
                        totalItems={organizations.total}
                        pageSize={25}
                        variant="pages"
                    />
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
                    <Stack
                        gap={2}
                        height="min(560px, calc(100dvh - var(--spacing-10) * 4))"
                        padding={8}
                        className="overflow-auto"
                    >
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
