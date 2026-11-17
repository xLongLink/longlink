import { useState } from 'react';
import { Info } from 'lucide-react';
import { useAdminList } from './use-list';
import { useApi } from '@/lib/hooks/use-api';
import { Button } from '@/components/longlink/action/button';
import { AdminSearch } from '@/components/custom/admin-search';
import { Pagination } from '@/components/longlink/action/pagination';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { OperationMetadata } from '@/components/dialogs/operation-metadata';
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
    const { search, pagination, suffix } = useAdminList();
    const [metadataId, setMetadataId] = useState<string | null>(null);

    const [operations] = useApi(`/api/v1/operations${suffix}`, zPageOperationResponse);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = operations.items.find((item) => item.id === metadataId);

    if (metadataId !== null && !metadata) setMetadataId(null);

    return (
        <Stack gap={2}>
            <title>Operations | LongLink</title>
            <h1 className="font-semibold tracking-tight text-4xl">Operations</h1>
            <AdminSearch
                id="search-operations"
                label="Search operations"
                placeholder="Search by operation kind or resource name"
                {...search}
            />
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
                                    <Stack align="start">
                                        <span>{kinds[row.kind]}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {statuses[row.status]}
                                            {row.finished_at && ` - ${row.finished_at}`}
                                        </span>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Stack align="start">
                                        <span>{row.resource_name ?? 'Resource unavailable'}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {row.kind.startsWith('solution.') ? 'Solution' : 'Organization'}
                                        </span>
                                    </Stack>
                                </TableCell>
                                <TableCell align="end">
                                    <Button size="sm" variant="ghost" onClick={() => setMetadataId(row.id)}>
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
            {metadata && <OperationMetadata open metadata={metadata} onOpenChange={() => setMetadataId(null)} />}
        </Stack>
    );
}
import { Empty } from '@/components/longlink/display/empty';
