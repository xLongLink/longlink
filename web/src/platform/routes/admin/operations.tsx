import { Info } from 'lucide-react';
import { useMetadata } from './use-metadata';
import { useApi } from '@/lib/hooks/use-api';
import { useListControls } from './use-list-controls';
import { Stack } from '@/components/longlink/layout/stack';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Timestamp } from '@/components/longlink/display/timestamp';
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
            <h1 className="font-semibold tracking-tight text-4xl">Operations</h1>
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
                                        <span>{kinds[row.kind]}</span>
                                        <Stack direction="horizontal" gap={1} align="center" wrap="wrap">
                                            <Badge variant={row.status === 'failed' ? 'destructive' : 'secondary'}>
                                                {statuses[row.status]}
                                            </Badge>
                                            {row.finished_at && (
                                                <Timestamp value={row.finished_at} format="date_time" />
                                            )}
                                        </Stack>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <span>{row.resource_name ?? 'Resource unavailable'}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {row.kind.startsWith('solution.') ? 'Solution' : 'Organization'}
                                        </span>
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
                                    <Empty title="No data" />
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
                        <span>
                            <b>Operation</b> {metadata.kind}
                        </span>
                        <span>
                            <b>Status</b>{' '}
                            <Badge variant={metadata.status === 'failed' ? 'destructive' : 'secondary'}>
                                {metadata.status}
                            </Badge>
                        </span>
                        <span>
                            <b>ID</b> {metadata.id}
                        </span>
                        <span>
                            <b>Target</b> {metadata.target_id}
                        </span>
                        <span>
                            <b>Created</b> <Timestamp value={metadata.created_at} format="date_time" />
                        </span>
                        {metadata.finished_at && (
                            <span>
                                <b>Finished</b> <Timestamp value={metadata.finished_at} format="date_time" />
                            </span>
                        )}
                        {metadata.failed && (
                            <span>
                                <b>Reason</b> {metadata.failed}
                            </span>
                        )}
                    </Stack>
                </Dialog>
            )}
        </Stack>
    );
}
