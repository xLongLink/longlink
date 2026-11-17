import { api } from '@/lib/api';
import { Info } from 'lucide-react';
import { useAdminList } from './use-list';
import { useApi } from '@/lib/hooks/use-api';
import { useAdminSelection } from './use-selection';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Avatar } from '@/components/longlink/display/avatar';
import { AdminSearch } from '@/components/custom/admin-search';
import { DeletionDialog } from '@/components/dialogs/deletion';
import { NativeLink as Link } from '@/components/custom/native-link';
import { Pagination } from '@/components/longlink/action/pagination';
import { SolutionMetadata } from '@/components/dialogs/solution-metadata';
import { zPageSolutionResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists Solutions and manages administrator metadata and deletion dialogs. */
export default function Solutions() {
    const { search, pagination, suffix } = useAdminList();

    const [solutions, invalidate] = useApi(`/api/v1/solutions${suffix}`, zPageSolutionResponse);

    const { metadata, deletion, openMetadata, confirmDeletion, close } = useAdminSelection(solutions.items);

    return (
        <Stack gap={2}>
            <title>Solutions | LongLink</title>
            <h1 className="font-semibold tracking-tight text-4xl">Solutions</h1>
            <AdminSearch
                id="search-solutions"
                label="Search solutions"
                placeholder="Search by name, description, or organization"
                {...search}
            />
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
                                                <span
                                                    className={
                                                        row.status === 'creating'
                                                            ? 'text-xs text-info-foreground'
                                                            : 'text-xs text-destructive-foreground'
                                                    }
                                                >
                                                    {row.status === 'creating' ? 'Creating' : 'Failed'}
                                                </span>
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
                                    <Button size="sm" variant="ghost" onClick={() => openMetadata(row.id)}>
                                        <Info aria-hidden="true" />
                                        Metadata
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {solutions.items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    <Empty role="status" title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <footer className="flex flex-col items-center py-2">
                    <Pagination {...pagination} totalItems={solutions.total} />
                </footer>
            </Stack>
            {metadata && <SolutionMetadata open metadata={metadata} onOpenChange={close} onDelete={confirmDeletion} />}
            <DeletionDialog
                confirmation={
                    deletion
                        ? {
                              title: 'Delete solution',
                              description: `Delete solution ${deletion.name}?`,
                              onDelete: async () => {
                                  // Refresh the list only after deletion succeeds.
                                  await api.delete(`/api/v1/solutions/${deletion.id}`);
                                  await invalidate();
                                  close();
                              }
                          }
                        : null
                }
                onClose={close}
            />
        </Stack>
    );
}
import { Empty } from '@/components/longlink/display/empty';
