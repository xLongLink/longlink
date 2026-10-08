import type { z } from 'zod';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { NoIndex } from '@/components/NoIndex';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import type { zPageOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';

const kinds = {
    'solution.deploy': 'Solution deployment',
    'solution.delete': 'Solution deletion',
    'organization.create': 'Organization creation',
    'organization.delete': 'Organization deletion',
};
const statuses = { scheduled: 'Scheduled', active: 'Active', completed: 'Completed', failed: 'Failed' };

/** Lists operation history and exposes its metadata. */
export default function Operations() {
    const [page, setPage] = useState(1);
    const [metadataId, setMetadataId] = useState<string | null>(null);
    const [operations] = useApi<z.output<typeof zPageOperationResponse>>(
        `/api/v1/operations?page=${page}&page_size=25`
    );

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = operations.items.find((item) => item.id === metadataId);
    if (metadataId !== null && !metadata) setMetadataId(null);

    return (
        <Stack gap={4}>
            <NoIndex title="Operations | LongLink" />
            <Heading level={1}>Operations</Heading>
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
                                        {row.finished_at
                                            ? `${statuses[row.status]} - ${row.finished_at}`
                                            : `Started - ${row.created_at}`}
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
                <Pagination page={page} onChange={setPage} totalItems={operations.total} pageSize={25} variant="none" />
            </Stack>
            {metadata && (
                <Dialog
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setMetadataId(null);
                    }}
                >
                    <DialogHeader title="Operation metadata" onOpenChange={() => setMetadataId(null)} />
                    <Stack gap={2}>
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
