import { api } from '@/lib/api';
import { Info } from 'lucide-react';
import { useMetadata } from './use-metadata';
import { useApi } from '@/lib/hooks/use-api';
import { useListControls } from './use-list-controls';
import { Link } from '@/components/longlink/action/link';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Avatar } from '@/components/longlink/display/avatar';
import { Heading } from '@/components/longlink/display/heading';
import { Pagination } from '@/components/longlink/action/pagination';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';
import { zPageOrganizationIdentity } from '@/lib/generated/platform-api-v1/zod.gen';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists organizations and confirms administrator deletion. */
export default function Organizations() {
    const { suffix, searchField, pagination } = useListControls('organizations', 'Search by name');
    const confirmation = useConfirm();

    const [organizations, invalidate] = useApi(`/api/v1/organizations${suffix}`, zPageOrganizationIdentity);

    const [metadata, selectMetadata] = useMetadata(organizations.items);

    return (
        <Stack gap={2}>
            <title>Organizations | LongLink</title>
            <Heading level={1}>Organizations</Heading>
            {searchField}
            <Stack gap={1}>
                <Table wrap>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead align="end">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {organizations.items.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Stack direction="horizontal" gap={3} align="center">
                                        <Avatar shape="rounded" name={row.name} />
                                        <Stack gap={0} align="start">
                                            <Stack direction="horizontal" gap={1} align="center">
                                                <Link href={`/orgs/${row.id}`}>{row.name}</Link>
                                                {row.status !== 'running' && (
                                                    <Badge
                                                        variant={
                                                            row.status === 'creating' ? 'secondary' : 'destructive'
                                                        }
                                                    >
                                                        {row.status === 'creating' ? 'Creating' : 'Failed'}
                                                    </Badge>
                                                )}
                                            </Stack>
                                            <Text size="xs" tone="muted">
                                                Organization
                                            </Text>
                                        </Stack>
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
                        {organizations.items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} align="center">
                                    <Empty title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <Stack as="footer" gap={0} align="center" paddingBlock={2}>
                    <Pagination {...pagination} totalItems={organizations.total} />
                </Stack>
            </Stack>
            {metadata && (
                <Dialog
                    open
                    onOpenChange={(open) => {
                        if (!open) selectMetadata(null);
                    }}
                    title="Organization metadata"
                    footer={
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                selectMetadata(null);
                                confirmation.show({
                                    title: 'Delete organization',
                                    description: `Delete organization ${metadata.name}?`,
                                    actionLabel: 'Delete',
                                    actionVariant: 'destructive',
                                    onAction: async () => {
                                        await api.delete(`/api/v1/organizations/${metadata.id}`);
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
                        <Text>
                            <b>Status</b>{' '}
                            <Badge variant={metadata.status === 'failed' ? 'destructive' : 'secondary'}>
                                {metadata.status}
                            </Badge>
                        </Text>
                        <Text>
                            <b>ID</b> {metadata.id}
                        </Text>
                    </Stack>
                </Dialog>
            )}
            {confirmation.element}
        </Stack>
    );
}
