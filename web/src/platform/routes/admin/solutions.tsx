import { api } from '@/lib/api';
import { Info } from 'lucide-react';
import { useMetadata } from './use-metadata';
import { useApi } from '@/lib/hooks/use-api';
import { useListControls } from './use-list-controls';
import { Link } from '@/components/longlink/action/link';
import { Stack } from '@/components/longlink/layout/stack';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Avatar } from '@/components/longlink/display/avatar';
import { Timestamp } from '@/components/longlink/display/timestamp';
import { Pagination } from '@/components/longlink/action/pagination';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';
import { zPageSolutionResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists Solutions and manages administrator metadata and deletion dialogs. */
export default function Solutions() {
    const { suffix, searchField, pagination } = useListControls(
        'solutions',
        'Search by name, description, or organization'
    );
    const confirmation = useConfirm();

    const [solutions, invalidate] = useApi(`/api/v1/solutions${suffix}`, zPageSolutionResponse);

    const [metadata, selectMetadata] = useMetadata(solutions.items);

    return (
        <Stack gap={2}>
            <title>Solutions | LongLink</title>
            <h1 className="font-semibold tracking-tight text-4xl">Solutions</h1>
            {searchField}
            <Stack gap={1}>
                <Table wrap>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Solution</TableHead>
                            <TableHead>Organization</TableHead>
                            <TableHead>Image</TableHead>
                            <TableHead align="end">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {solutions.items.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Link href={`/orgs/${row.organization.id}/solutions/${row.id}`}>
                                                {row.name}
                                            </Link>
                                            {row.status !== 'running' && (
                                                <Badge
                                                    variant={row.status === 'creating' ? 'secondary' : 'destructive'}
                                                >
                                                    {row.status === 'creating' ? 'Creating' : 'Failed'}
                                                </Badge>
                                            )}
                                        </Stack>
                                        {row.description && (
                                            <span className="text-xs text-muted-foreground">{row.description}</span>
                                        )}
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Stack direction="horizontal" gap={3} align="center">
                                        <Avatar shape="rounded" name={row.organization.name} />
                                        <Stack gap={0} align="start">
                                            <Link href={`/orgs/${row.organization.id}`}>{row.organization.name}</Link>
                                            <span className="text-xs text-muted-foreground">Organization</span>
                                        </Stack>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <span>
                                            {row.image_desired.replace(
                                                /@sha256:[a-f0-9]{5,}([a-f0-9]{4})$/,
                                                '@sha25...$1'
                                            )}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Revision: {row.desired_revision_id ?? 'Not selected'}
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
                        {solutions.items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    <Empty title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <footer className="flex flex-col items-center py-2">
                    <Pagination {...pagination} totalItems={solutions.total} />
                </footer>
            </Stack>
            {metadata && (
                <Dialog
                    open
                    onOpenChange={(open) => {
                        if (!open) selectMetadata(null);
                    }}
                    title="Solution metadata"
                    footer={
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                selectMetadata(null);
                                confirmation.show({
                                    title: 'Delete solution',
                                    description: `Delete solution ${metadata.name}?`,
                                    actionLabel: 'Delete',
                                    actionVariant: 'destructive',
                                    onAction: async () => {
                                        await api.delete(`/api/v1/solutions/${metadata.id}`);
                                        await invalidate();
                                    }
                                });
                            }}
                        >
                            Delete
                        </Button>
                    }
                >
                    <Stack gap={2}>
                        <span>
                            <b>Status</b>{' '}
                            <Badge variant={metadata.status === 'failed' ? 'destructive' : 'secondary'}>
                                {metadata.status}
                            </Badge>
                        </span>
                        <span>
                            <b>Organization</b> {metadata.organization.name}
                        </span>
                        <span>
                            <b>Desired image</b> {metadata.image_desired}
                        </span>
                        <span>
                            <b>Desired revision</b> {metadata.desired_revision_id ?? 'Not selected'}
                        </span>
                        <span>
                            <b>Last deployed revision</b> {metadata.deployed_revision_id ?? 'Never deployed'}
                        </span>
                        <span>
                            <b>ID</b> {metadata.id}
                        </span>
                        {metadata.description && (
                            <span>
                                <b>Description</b> {metadata.description}
                            </span>
                        )}
                        <span>
                            <b>Created</b> <Timestamp value={metadata.created_at} format="date_time" />
                        </span>
                    </Stack>
                </Dialog>
            )}
            {confirmation.element}
        </Stack>
    );
}
