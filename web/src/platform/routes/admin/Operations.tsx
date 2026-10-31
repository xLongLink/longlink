import { useState } from 'react';
import { useAdminList } from './use-list';
import { Info, Search } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@/components/ui/TextInput';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Table, proportional } from '@astryxdesign/core/Table';
import { zPageOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';

const kinds = {
    'solution.deploy': 'Solution deployment',
    'solution.delete': 'Solution deletion',
    'organization.create': 'Organization creation',
    'organization.delete': 'Organization deletion',
};

const statuses = { scheduled: 'Planned', active: 'Active', completed: 'Completed', failed: 'Failed' };

/** Lists operation history and exposes its metadata. */
export default function Operations() {
    const { search, pagination, suffix } = useAdminList();
    const [metadataId, setMetadataId] = useState<string | null>(null);

    const [operations] = useApi(`/api/v1/operations${suffix}`, zPageOperationResponse);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = operations.items.find((item) => item.id === metadataId);

    if (metadataId !== null && !metadata) setMetadataId(null);

    return (
        <Stack gap={2}>
            <title>Operations | LongLink</title>
            <Heading level={1}>Operations</Heading>
            <TextInput
                label="Search operations"
                placeholder="Search by operation kind or resource name"
                {...search}
                startIcon={<Search />}
            />
            <Stack gap={1}>
                <Table
                    data={operations.items}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'kind',
                            header: 'Operation',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack align="start">
                                    <Text>{kinds[row.kind]}</Text>
                                    <Text type="supporting">
                                        {statuses[row.status]}
                                        {row.finished_at && ` - ${row.finished_at}`}
                                    </Text>
                                </Stack>
                            ),
                        },
                        {
                            key: 'resource_name',
                            header: 'Resource',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack align="start">
                                    <Text>{row.resource_name ?? 'Resource unavailable'}</Text>
                                    <Text type="supporting">
                                        {row.kind.startsWith('solution.') ? 'Solution' : 'Organization'}
                                    </Text>
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
                                    onClick={() => setMetadataId(row.id)}
                                />
                            ),
                        },
                    ]}
                />
                <Stack as="footer" align="center" paddingBlock={2}>
                    <Pagination {...pagination} totalItems={operations.total} variant="pages" />
                </Stack>
            </Stack>
            {metadata && (
                <Dialog
                    title="Operation metadata"
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setMetadataId(null);
                    }}
                >
                    <Stack gap={2} padding={8}>
                        <Text>
                            <b>Operation</b> {metadata.kind}
                        </Text>
                        <Text>
                            <b>Status</b> {metadata.status}
                        </Text>
                        <Text>
                            <b>ID</b> {metadata.id}
                        </Text>
                        <Text>
                            <b>Target</b> {metadata.target_id}
                        </Text>
                        <Text>
                            <b>Created</b> {metadata.created_at}
                        </Text>
                        {metadata.finished_at && (
                            <Text>
                                <b>Finished</b> {metadata.finished_at}
                            </Text>
                        )}
                        {metadata.failed && (
                            <Text>
                                <b>Reason</b> {metadata.failed}
                            </Text>
                        )}
                    </Stack>
                </Dialog>
            )}
        </Stack>
    );
}
