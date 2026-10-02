import type { z } from 'zod';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Spinner } from '@astryxdesign/core/Spinner';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { zPageOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';

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
    const [metadata, setMetadata] = useState<z.output<typeof zPageOperationResponse>['items'][number] | null>(null);
    const operations = useApi(`/api/v1/operations?page=${page}&page_size=25`, zPageOperationResponse);

    // Keep loading and failures distinct from an empty result.
    if (operations.error) return <Banner status="error" title="Unable to load operations" />;
    if (!operations.data) return <Spinner label="Loading operations" />;

    return (
        <Stack gap={8}>
            <Heading level={1}>Operations</Heading>
            <Stack gap={1}>
                <Table
                    data={operations.data.items}
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
                                <MoreMenu
                                    alignment="end"
                                    items={[
                                        {
                                            id: 'metadata',
                                            label: 'Metadata',
                                            icon: <Info />,
                                            onClick: () => setMetadata(row),
                                        },
                                    ]}
                                />
                            ),
                        },
                    ]}
                />
                <Stack direction="horizontal" gap={2} justify="between">
                    <Button label="Previous" isDisabled={page === 1} onClick={() => setPage(page - 1)} />
                    <Button
                        label="Next"
                        isDisabled={operations.data.total <= page * 25}
                        onClick={() => setPage(page + 1)}
                    />
                </Stack>
            </Stack>
            {metadata && (
                <Dialog
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setMetadata(null);
                    }}
                >
                    <DialogHeader title="Operation metadata" onOpenChange={() => setMetadata(null)} />
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
