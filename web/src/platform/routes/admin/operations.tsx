import { Info } from 'lucide-react';
import { useMetadata } from './use-metadata';
import { useApi } from '@/lib/hooks/use-api';
import { useListControls } from './use-list-controls';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import { Pagination } from '@/components/longlink/action/pagination';
import { zPageOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

const kinds = {
    'solution.deploy': 'Solution deployment',
    'solution.delete': 'Solution deletion',
    'organization.create': 'Organization creation',
    'organization.delete': 'Organization deletion'
};

const statuses = { scheduled: 'Planned', active: 'Active', completed: 'Completed', failed: 'Failed' };

/** Lists operation history and exposes its metadata. */
export default function Operations() {
    const { suffix, searchField, pagination } = useListControls(
        'operations',
        'Search by operation kind or resource name'
    );

    const [operations] = useApi(`/api/v1/operations${suffix}`, zPageOperationResponse);

    const [metadata, selectMetadata] = useMetadata(operations.items);

    return (
        <Stack gap={2}>
            <title>Operations | LongLink</title>
            <Heading level={1}>Operations</Heading>
            {searchField}
            <Stack gap={1}>
                <Table wrap>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Operation</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead align="end">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {operations.items.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <Text>{kinds[row.kind]}</Text>
                                        <Text size="xs" tone="muted">
                                            {statuses[row.status]}
                                            {row.finished_at && ` - ${row.finished_at}`}
                                        </Text>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <Text>{row.resource_name ?? 'Resource unavailable'}</Text>
                                        <Text size="xs" tone="muted">
                                            {row.kind.startsWith('solution.') ? 'Solution' : 'Organization'}
                                        </Text>
                                    </Stack>
                                </TableCell>
                                <TableCell align="end">
                                    <Button size="sm" variant="ghost" onClick={() => selectMetadata(row.id)}>
                                        <Info aria-hidden="true" />
                                        Metadata
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {operations.items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} align="center">
                                    <Empty role="status" title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <footer className="flex flex-col items-center py-2">
                    <Pagination {...pagination} totalItems={operations.total} />
                </footer>
            </Stack>
            {metadata && (
                <Dialog
                    open
                    onOpenChange={(open) => {
                        if (!open) selectMetadata(null);
                    }}
                    title="Operation metadata"
                >
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
