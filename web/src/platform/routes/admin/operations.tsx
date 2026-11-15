import { useRef, useState } from 'react';
import { useAdminList } from './use-list';
import { useApi } from '@/lib/hooks/use-api';
import { Info, Search, X } from 'lucide-react';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { DataPagination } from '@/components/custom/data-pagination';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DataTable, proportional } from '@/components/custom/data-table';
import { NativeButton as Button } from '@/components/custom/native-button';
import { OperationMetadata } from '@/components/dialogs/operation-metadata';
import { zPageOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';

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
    const searchInput = useRef<HTMLInputElement>(null);
    const [metadataId, setMetadataId] = useState<string | null>(null);

    const [operations] = useApi(`/api/v1/operations${suffix}`, zPageOperationResponse);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = operations.items.find((item) => item.id === metadataId);

    if (metadataId !== null && !metadata) setMetadataId(null);

    return (
        <Stack gap={2}>
            <title>Operations | LongLink</title>
            <h1 className="font-semibold tracking-tight text-4xl">Operations</h1>
            <Field>
                <FieldLabel htmlFor="search-operations">Search operations</FieldLabel>
                <InputGroup>
                    <InputGroupInput
                        ref={searchInput}
                        id="search-operations"
                        placeholder="Search by operation kind or resource name"
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
                                aria-label="Clear Search operations"
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
                    data={operations.items}
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
                                    <span>{kinds[row.kind]}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {statuses[row.status]}
                                        {row.finished_at && ` - ${row.finished_at}`}
                                    </span>
                                </Stack>
                            )
                        },
                        {
                            key: 'resource_name',
                            header: 'Resource',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack align="start">
                                    <span>{row.resource_name ?? 'Resource unavailable'}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {row.kind.startsWith('solution.') ? 'Solution' : 'Organization'}
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
                                    onClick={() => setMetadataId(row.id)}
                                />
                            )
                        }
                    ]}
                />
                <footer className="flex flex-col items-center py-2">
                    <DataPagination {...pagination} totalItems={operations.total} />
                </footer>
            </Stack>
            {metadata && <OperationMetadata metadata={metadata} onClose={() => setMetadataId(null)} />}
        </Stack>
    );
}
