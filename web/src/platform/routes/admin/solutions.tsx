import { api } from '@/lib/api';
import { useRef, useState } from 'react';
import { useAdminList } from './use-list';
import { useApi } from '@/lib/hooks/use-api';
import { Info, Search, X } from 'lucide-react';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { DeletionDialog } from '@/components/dialogs/deletion';
import { DataPagination } from '@/components/custom/data-pagination';
import { NativeLink as Link } from '@/components/custom/native-link';
import { GeneratedAvatar } from '@/components/custom/generated-avatar';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DataTable, proportional } from '@/components/custom/data-table';
import { SolutionMetadata } from '@/components/dialogs/solution-metadata';
import { NativeButton as Button } from '@/components/custom/native-button';
import { zPageSolutionResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';

/** Lists Solutions and manages administrator metadata and deletion dialogs. */
export default function Solutions() {
    const { search, pagination, suffix } = useAdminList();
    const searchInput = useRef<HTMLInputElement>(null);

    const [dialog, setDialog] = useState<
        { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null
    >(null);

    const [solutions, invalidate] = useApi(`/api/v1/solutions${suffix}`, zPageSolutionResponse);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = dialog?.kind === 'metadata' ? solutions.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return (
        <Stack gap={2}>
            <title>Solutions | LongLink</title>
            <h1 className="font-semibold tracking-tight text-4xl">Solutions</h1>
            <Field>
                <FieldLabel htmlFor="search-solutions">Search solutions</FieldLabel>
                <InputGroup>
                    <InputGroupInput
                        ref={searchInput}
                        id="search-solutions"
                        placeholder="Search by name, description, or organization"
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
                                aria-label="Clear Search solutions"
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
                <DataTable
                    data={solutions.items}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'name',
                            header: 'Solution',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack align="start">
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
                            )
                        },
                        {
                            key: 'organization',
                            header: 'Organization',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack direction="horizontal" gap={3} align="center">
                                    <GeneratedAvatar kind="organization" name={row.organization.name} />
                                    <Stack align="start">
                                        <Link href={`/orgs/${row.organization.id}`}>{row.organization.name}</Link>
                                        <span className="text-xs text-muted-foreground">Organization</span>
                                    </Stack>
                                </Stack>
                            )
                        },
                        {
                            key: 'image_desired',
                            header: 'Image',
                            width: proportional(2),
                            renderCell: (row) => (
                                <Stack align="start">
                                    <span>
                                        {row.image_desired.replace(/@sha256:[a-f0-9]{5,}([a-f0-9]{4})$/, '@sha25...$1')}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Revision: {row.desired_revision_id ?? 'Not selected'}
                                    </span>
                                </Stack>
                            )
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
                                    onClick={() => setDialog({ kind: 'metadata', id: row.id })}
                                />
                            )
                        }
                    ]}
                />
                <footer className="flex flex-col items-center py-2">
                    <DataPagination {...pagination} totalItems={solutions.total} />
                </footer>
            </Stack>
            {metadata && (
                <SolutionMetadata
                    metadata={metadata}
                    onClose={() => setDialog(null)}
                    onDelete={() => setDialog({ kind: 'deletion', item: { id: metadata.id, name: metadata.name } })}
                />
            )}
            <DeletionDialog
                confirmation={
                    dialog?.kind === 'deletion'
                        ? {
                              title: 'Delete solution',
                              description: `Delete solution ${dialog.item.name}?`,
                              onDelete: async () => {
                                  // Refresh the list only after deletion succeeds.
                                  await api.delete(`/api/v1/solutions/${dialog.item.id}`);
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
