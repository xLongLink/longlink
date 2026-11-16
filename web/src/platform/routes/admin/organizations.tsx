import { api } from '@/lib/api';
import { useRef, useState } from 'react';
import { useAdminList } from './use-list';
import { useApi } from '@/lib/hooks/use-api';
import { Info, Search, X } from 'lucide-react';
import { Badge } from '@/components/longlink/display/badge';
import { Button } from '@/components/longlink/action/button';
import { Avatar } from '@/components/longlink/display/avatar';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { DeletionDialog } from '@/components/dialogs/deletion';
import { NativeLink as Link } from '@/components/custom/native-link';
import { Pagination } from '@/components/longlink/action/pagination';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { OrganizationMetadata } from '@/components/dialogs/organization-metadata';
import { zPageOrganizationIdentity } from '@/lib/generated/platform-api-v1/zod.gen';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists organizations and confirms administrator deletion. */
export default function Organizations() {
    const { search, pagination, suffix } = useAdminList();
    const searchInput = useRef<HTMLInputElement>(null);

    const [dialog, setDialog] = useState<
        { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null
    >(null);

    const [organizations, invalidate] = useApi(`/api/v1/organizations${suffix}`, zPageOrganizationIdentity);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
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
                        value={search.value}
                        onChange={(event) => search.onChange(event.target.value)}
                    />
                    <InputGroupAddon aria-hidden="true">
                        <Search />
                    </InputGroupAddon>
                    {search.value !== '' && (
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                size="icon-xs"
                                aria-label="Clear Search organizations"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    search.onChange('');
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
                                        <Stack align="start">
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
                    <Pagination {...pagination} totalItems={organizations.total} />
                </footer>
            </Stack>
            {metadata && (
                <OrganizationMetadata
                    open
                    metadata={metadata}
                    onOpenChange={() => setDialog(null)}
                    onDelete={() => setDialog({ kind: 'deletion', item: { id: metadata.id, name: metadata.name } })}
                />
            )}
            <DeletionDialog
                confirmation={
                    dialog?.kind === 'deletion'
                        ? {
                              title: 'Delete organization',
                              description: `Delete organization ${dialog.item.name}?`,
                              onDelete: async () => {
                                  // Refresh the list only after deletion succeeds.
                                  await api.delete(`/api/v1/organizations/${dialog.item.id}`);
                                  await invalidate();
                                  setDialog(null);
                              }
                          }
                        : null
                }
                onClose={() => setDialog(null)}
            />
        </Stack>
    );
}
import { Empty } from '@/components/longlink/display/empty';
