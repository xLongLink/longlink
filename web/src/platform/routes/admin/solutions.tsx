import { api } from '@/lib/api';
import { useState } from 'react';
import { useAdminList } from './use-list';
import { Info, Search } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { Dialog } from '@/components/custom/dialog';
import { DeletionDialog } from '@/components/deletion';
import { TextInput } from '@/components/custom/text-input';
import { DataPagination } from '@/components/custom/data-pagination';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeText as Text } from '@/components/custom/native-text';
import { GeneratedAvatar } from '@/components/custom/generated-avatar';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DataTable, proportional } from '@/components/custom/data-table';
import { NativeButton as Button } from '@/components/custom/native-button';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { zPageSolutionResponse } from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists Solutions and manages administrator metadata and deletion dialogs. */
export default function Solutions() {
    const { search, pagination, suffix } = useAdminList();

    const [dialog, setDialog] = useState<
        { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null
    >(null);

    const [solutions, invalidate] = useApi(`/api/v1/solutions${suffix}`, zPageSolutionResponse);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = dialog?.kind === 'metadata' ? solutions.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return (
        <Stack gap={2}>
            <title>Solutions | LongLink</title>
            <Heading level={1}>Solutions</Heading>
            <TextInput
                label="Search solutions"
                placeholder="Search by name, description, or organization"
                {...search}
                startIcon={<Search />}
            />
            <Stack gap={1}>
                <DataTable
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
                                        <Link href={`/orgs/${row.organization.id}/solutions/${row.id}`}>
                                            {row.name}
                                        </Link>
                                        {row.status !== 'running' && (
                                            <Text
                                                className={
                                                    row.status === 'creating'
                                                        ? 'text-xs text-info-foreground'
                                                        : 'text-xs text-destructive-foreground'
                                                }
                                            >
                                                {row.status === 'creating' ? 'Creating' : 'Failed'}
                                            </Text>
                                        )}
                                    </Stack>
                                    {row.description && (
                                        <Text className="text-xs text-muted-foreground">{row.description}</Text>
                                    )}
                                </Stack>
                            )
                        },
                        {
                            key: 'organization',
                            header: 'Organization',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack direction="horizontal" gap={3} align="center">
                                    <GeneratedAvatar kind="organization" name={row.organization.name} />
                                    <Stack align="start">
                                        <Link href={`/orgs/${row.organization.id}`}>{row.organization.name}</Link>
                                        <Text className="text-xs text-muted-foreground">Organization</Text>
                                    </Stack>
                                </Stack>
                            )
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
                                    <Text className="text-xs text-muted-foreground">
                                        Revision: {row.desired_revision_id ?? 'Not selected'}
                                    </Text>
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
                    <DataPagination {...pagination} totalItems={solutions.total} />
                </Stack>
            </Stack>
            {metadata && (
                <Dialog
                    title="Solution metadata"
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
                                    setDialog({ kind: 'deletion', item: { id: metadata.id, name: metadata.name } })
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
                              title: 'Delete solution',
                              description: `Delete solution ${dialog.item.name}?`,
                              onDelete: async () => {
                                  // Refresh the list only after deletion succeeds.
                                  await api.delete(`/api/v1/solutions/${dialog.item.id}`);
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
