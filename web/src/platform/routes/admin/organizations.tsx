import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks/use-api';
import { Info, Search, X } from 'lucide-react';
import { Link } from '@/components/longlink/action/link';
import { Stack } from '@/components/longlink/layout/stack';
import { useDeferredValue, useRef, useState } from 'react';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Avatar } from '@/components/longlink/display/avatar';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { Pagination } from '@/components/longlink/action/pagination';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';
import { zPageOrganizationIdentity } from '@/lib/generated/platform-api-v1/zod.gen';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists organizations and confirms administrator deletion. */
export default function Organizations() {
    const [filters, setFilters] = useState({ search: '', page: 1 });
    const { search, page } = useDeferredValue(filters);
    const suffix = `?page=${page}&page_size=25&search=${encodeURIComponent(search.trim())}`;
    const searchInput = useRef<HTMLInputElement>(null);
    const [dialog, setDialog] = useState<{ kind: 'metadata'; id: string } | null>(null);
    const confirmation = useConfirm();

    const [organizations, invalidate] = useApi(`/api/v1/organizations${suffix}`, zPageOrganizationIdentity);

    // Forget missing metadata.
    const metadata =
        dialog?.kind === 'metadata' ? organizations.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return (
        <Stack gap={2}>
            <title>Organizations | LongLink</title>
            <h1 className="font-semibold tracking-tight text-4xl">Organizations</h1>
            <Field>
                <FieldLabel htmlFor="search-organizations">Search organizations</FieldLabel>
                <InputGroup>
                    <InputGroupInput
                        ref={searchInput}
                        id="search-organizations"
                        placeholder="Search by name"
                        value={filters.search}
                        onChange={(event) => setFilters({ search: event.target.value, page: 1 })}
                    />
                    <InputGroupAddon aria-hidden="true">
                        <Search />
                    </InputGroupAddon>
                    {filters.search !== '' && (
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                size="icon-xs"
                                aria-label="Clear Search organizations"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    setFilters({ search: '', page: 1 });
                                    searchInput.current?.focus({ preventScroll: true });
                                }}
                            >
                                <X aria-hidden="true" />
                            </InputGroupButton>
                        </InputGroupAddon>
                    )}
                </InputGroup>
            </Field>
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
                                            <span className="text-xs text-muted-foreground">Organization</span>
                                        </Stack>
                                    </Stack>
                                </TableCell>
                                <TableCell align="end">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setDialog({ kind: 'metadata', id: row.id })}
                                    >
                                        <Info aria-hidden="true" />
                                        Metadata
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {organizations.items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} align="center">
                                    <Empty role="status" title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <footer className="flex flex-col items-center py-2">
                    <Pagination
                        page={filters.page}
                        pageSize={25}
                        onPageChange={(page) => setFilters({ ...filters, page })}
                        totalItems={organizations.total}
                    />
                </footer>
            </Stack>
            {metadata && (
                <Dialog
                    open
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                    title="Organization metadata"
                    footer={
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                setDialog(null);
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
                        <span>
                            <b>Status</b> {metadata.status}
                        </span>
                        <span>
                            <b>ID</b> {metadata.id}
                        </span>
                    </Stack>
                </Dialog>
            )}
            {confirmation.element}
        </Stack>
    );
}
