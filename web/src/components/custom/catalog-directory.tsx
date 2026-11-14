import { useDownload } from './preview';
import { Badge } from '@/components/reui/badge';
import { Button } from '@/components/shadcn/button';
import { IconTile } from '@/components/reui/icon-tile';
import { useCallback, useMemo, useState } from 'react';
import { Filters } from '@/components/reui/filters/filters';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination';
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area';
import type { FilterField, FilterQuery } from '@/components/reui/filters/filters-types';
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header';
import { formatContext, readBookmarks, writeBookmarks, type DirectoryModel } from './models';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/shadcn/input-group';
import { Frame, FrameFooter, FrameHeader, FramePanel, FrameTitle } from '@/components/reui/frame';
import { createFilterQuery, flattenFilterConditions } from '@/components/reui/filters/filters-query';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/shadcn/collapsible';
import { DataGrid, dataGridFeatures, type DataGridFeatures } from '@/components/reui/data-grid/data-grid';
import { useTable, type ColumnDef, type PaginationState, type SortingState } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import {
    ArrowLeft,
    Bookmark,
    Check,
    ChevronDown,
    Copy,
    Download,
    Image,
    Search,
    Star,
    Type,
    Volume2,
    X
} from 'lucide-react';

function ModelMark({ model }: { model: DirectoryModel }) {
    return (
        <IconTile size="sm" variant="outline">
            <span className="text-xs font-semibold">{model.provider.slice(0, 2)}</span>
        </IconTile>
    );
}

function SaveModel({ model, saved, onSave }: { model: DirectoryModel; saved: boolean; onSave: () => void }) {
    return (
        <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`${saved ? 'Unsave' : 'Save'} ${model.name}`}
            aria-pressed={saved}
            onClick={onSave}
        >
            <Bookmark fill={saved ? 'currentColor' : 'none'} />
        </Button>
    );
}

function ModelModalities({ modalities }: { modalities: string[] }) {
    return (
        <div className="flex items-center gap-2">
            {modalities.map((modality) => {
                const Glyph = modality === 'image' ? Image : modality === 'audio' ? Volume2 : Type;

                return (
                    <span key={modality} title={`${modality} input/output`}>
                        <Glyph className="size-4 text-muted-foreground" aria-label={`${modality} input/output`} />
                    </span>
                );
            })}
        </div>
    );
}

function ModelDetail({
    model,
    saved,
    onSave,
    onBack
}: {
    model: DirectoryModel;
    saved: boolean;
    onSave: () => void;
    onBack: () => void;
}) {
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

    async function copyId() {
        try {
            await navigator.clipboard.writeText(model.id);
            setCopyState('copied');
        } catch {
            setCopyState('failed');
        }
    }

    return (
        <div className="flex max-w-3xl flex-col gap-6">
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={onBack}>
                <ArrowLeft />
                Back
            </Button>
            <div className="flex items-start gap-3">
                <ModelMark model={model} />
                <div className="flex min-w-0 flex-1 flex-col gap-0">
                    <h1 className="text-xl font-medium">{model.name}</h1>
                    <p className="text-xs text-muted-foreground">{model.provider.toLowerCase()}</p>
                </div>
                <SaveModel model={model} saved={saved} onSave={onSave} />
            </div>
            <p className="text-sm text-muted-foreground">{model.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
                <Star className="size-4" />
                <span className="tabular-nums">{model.rating.toFixed(1)}</span>
                <Badge variant="secondary">{model.reviews} reviews</Badge>
                <ModelModalities modalities={model.modalities} />
            </div>
            <Collapsible defaultOpen>
                <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" />}>
                    Technical details
                    <ChevronDown />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="flex flex-col gap-3 pt-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="self-start"
                            onClick={() => {
                                void copyId();
                            }}
                        >
                            {copyState === 'copied' ? <Check /> : <Copy />}Copy ID
                        </Button>
                        {copyState !== 'idle' && (
                            <p role="status" className="text-xs text-muted-foreground">
                                {copyState === 'copied' ? 'ID copied' : `Copy unavailable. ID: ${model.id}`}
                            </p>
                        )}
                        <Frame variant="ghost" stacked dense spacing="sm">
                            <FrameHeader>
                                <FrameTitle>At a glance</FrameTitle>
                            </FrameHeader>
                            <FramePanel>
                                <dl className="flex flex-col gap-3 text-sm">
                                    {[
                                        ['Model ID', model.id],
                                        ['Provider', model.provider],
                                        ['Context', `${formatContext(model.context)} tokens`],
                                        ['Input / 1M tokens', `$${model.input.toFixed(2)}`],
                                        ['Output / 1M tokens', `$${model.output.toFixed(2)}`],
                                        ['Modalities', model.modalities.join(', ')]
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex flex-wrap justify-between gap-3">
                                            <dt className="text-muted-foreground">{label}</dt>
                                            <dd className="break-all tabular-nums">{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </FramePanel>
                        </Frame>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

/** Lists searchable model records with sorting, paging, bookmarks, and details. */
export function CatalogDirectory({ models, exportPath }: { models: DirectoryModel[]; exportPath: string }) {
    const download = useDownload();
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState<FilterQuery>(() => createFilterQuery());
    const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [bookmarks, setBookmarks] = useState(readBookmarks);
    const [detail, setDetail] = useState<DirectoryModel | null>(null);

    const fields = useMemo<FilterField[]>(
        () => [
            {
                id: 'provider',
                label: 'Provider',
                type: 'select',
                options: [...new Set(models.map((model) => model.provider))]
                    .sort()
                    .map((provider) => ({ value: provider, label: provider })),
                operators: [
                    { value: 'is', label: 'is', inverse: 'is_not' },
                    { value: 'is_not', label: 'is not', inverse: 'is' }
                ]
            }
        ],
        [models]
    );

    const filtered = useMemo(() => {
        const conditions = flattenFilterConditions(query).filter((condition) => condition.values.length > 0);
        const term = search.trim().toLowerCase();

        return models.filter((model) => {
            if (!`${model.name} ${model.provider} ${model.tags.join(' ')}`.toLowerCase().includes(term)) return false;

            return conditions.every((condition) => {
                const matches = condition.values.includes(model.provider);
                const result = condition.operator === 'is_not' ? !matches : matches;

                return condition.negated ? !result : result;
            });
        });
    }, [models, query, search]);

    const save = useCallback(
        (model: DirectoryModel) => {
            const next = bookmarks.includes(model.id)
                ? bookmarks.filter((id) => id !== model.id)
                : [...bookmarks, model.id];

            setBookmarks(next);
            writeBookmarks(next);
        },
        [bookmarks]
    );

    function clearFilters() {
        setSearch('');
        setQuery(createFilterQuery());
        setPagination((current) => ({ ...current, pageIndex: 0 }));
    }

    const columns = useMemo<ColumnDef<DataGridFeatures, DirectoryModel>[]>(
        () => [
            {
                accessorKey: 'name',
                size: 560,
                minSize: 300,
                header: ({ column }) => <DataGridColumnHeader column={column} title="Model" />,
                cell: ({ row }) => (
                    <div className="flex items-center gap-2.5">
                        <ModelMark model={row.original} />
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <a
                                href={`#${row.original.id}`}
                                className="text-[13px] font-medium hover:underline"
                                onClick={(event) => {
                                    event.preventDefault();
                                    setDetail(row.original);
                                }}
                            >
                                {row.original.name}
                            </a>
                            <span className="text-xs text-muted-foreground">{row.original.provider.toLowerCase()}</span>
                        </div>
                    </div>
                )
            },
            {
                accessorKey: 'rating',
                size: 120,
                header: ({ column }) => <DataGridColumnHeader column={column} title="Reviews" />,
                cell: ({ row }) => (
                    <div className="flex items-center gap-1.5 tabular-nums">
                        <Star className="size-3.5 text-muted-foreground" />
                        <span>{row.original.rating.toFixed(1)}</span>
                        <Badge variant="secondary">{row.original.reviews}</Badge>
                    </div>
                )
            },
            {
                accessorKey: 'context',
                size: 100,
                header: 'Context',
                enableSorting: false,
                cell: ({ row }) => (
                    <span className="text-muted-foreground tabular-nums">{formatContext(row.original.context)}</span>
                )
            },
            {
                accessorKey: 'input',
                size: 90,
                header: ({ column }) => <DataGridColumnHeader column={column} title="Input" />,
                cell: ({ row }) => <span className="tabular-nums">${row.original.input.toFixed(2)}</span>
            },
            {
                accessorKey: 'output',
                size: 90,
                header: 'Output',
                enableSorting: false,
                cell: ({ row }) => <span className="tabular-nums">${row.original.output.toFixed(2)}</span>
            },
            {
                id: 'modalities',
                size: 100,
                header: 'Modalities',
                enableSorting: false,
                cell: ({ row }) => <ModelModalities modalities={row.original.modalities} />
            },
            {
                id: 'save',
                size: 55,
                header: 'Save',
                enableSorting: false,
                cell: ({ row }) => (
                    <SaveModel
                        model={row.original}
                        saved={bookmarks.includes(row.original.id)}
                        onSave={() => save(row.original)}
                    />
                )
            }
        ],
        [bookmarks, save]
    );

    const table = useTable({
        features: dataGridFeatures,
        data: filtered,
        columns,
        getRowId: (row) => row.id,
        state: {
            sorting,
            pagination: {
                ...pagination,
                pageIndex: Math.min(
                    pagination.pageIndex,
                    Math.max(0, Math.ceil(filtered.length / pagination.pageSize) - 1)
                )
            }
        },
        onSortingChange: setSorting,
        onPaginationChange: setPagination
    });

    const sortedIds = table.getSortedRowModel().rows.map((row) => row.original.id);
    const currentSort = sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? 'desc' : 'asc'}` : 'default';

    if (detail)
        return (
            <ModelDetail
                key={detail.id}
                model={detail}
                saved={bookmarks.includes(detail.id)}
                onSave={() => save(detail)}
                onBack={() => setDetail(null)}
            />
        );

    return (
        <DataGrid
            table={table}
            recordCount={filtered.length}
            tableLayout={{ headerBackground: false, rowBorder: true }}
            tableClassNames={{ base: 'min-w-[1115px] text-[13px]', bodyRow: 'h-13', body: 'bg-background' }}
            emptyMessage={
                <div className="flex flex-col items-center gap-3 py-10">
                    <p>No models found</p>
                    <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                        Clear filters
                    </Button>
                </div>
            }
        >
            <Frame variant="ghost" stacked dense spacing="sm" className="min-w-0">
                <FrameHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <FrameTitle>All models</FrameTitle>
                            <Badge variant="secondary">{filtered.length}</Badge>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                void download.download(
                                    `${exportPath}?ids=${encodeURIComponent(sortedIds.join(','))}`,
                                    'models.csv'
                                );
                            }}
                        >
                            <Download />
                            Export
                        </Button>
                    </div>
                </FrameHeader>
                {download.error && (
                    <FramePanel>
                        <p role="alert">{download.error}</p>
                    </FramePanel>
                )}
                <FramePanel>
                    <div className="flex flex-wrap items-center gap-3">
                        <InputGroup className="w-full md:max-w-96">
                            <InputGroupAddon>
                                <Search />
                            </InputGroupAddon>
                            <InputGroupInput
                                aria-label="Search models"
                                placeholder="Search models"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                                }}
                            />
                            {search && (
                                <InputGroupAddon align="inline-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label="Clear search"
                                        onClick={() => {
                                            setSearch('');
                                            setPagination((current) => ({ ...current, pageIndex: 0 }));
                                        }}
                                    >
                                        <X />
                                    </Button>
                                </InputGroupAddon>
                            )}
                        </InputGroup>
                        <Filters
                            fields={fields}
                            query={query}
                            size="sm"
                            onQueryChange={(next) => {
                                setQuery(next);
                                setPagination((current) => ({ ...current, pageIndex: 0 }));
                            }}
                        />
                        <div className="ml-auto">
                            <Select
                                value={currentSort}
                                onValueChange={(value) => {
                                    if (!value) return;

                                    if (value === 'default') {
                                        setSorting([]);
                                        setPagination((current) => ({ ...current, pageIndex: 0 }));

                                        return;
                                    }

                                    const [id, direction] = value.split(':');
                                    setSorting([{ id, desc: direction === 'desc' }]);
                                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                                }}
                            >
                                <SelectTrigger size="sm" aria-label="Sort models">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default order</SelectItem>
                                    <SelectItem value="name:asc">Name A–Z</SelectItem>
                                    <SelectItem value="name:desc">Name Z–A</SelectItem>
                                    <SelectItem value="rating:desc">Highest rated</SelectItem>
                                    <SelectItem value="rating:asc">Lowest rated</SelectItem>
                                    <SelectItem value="input:asc">Lowest input price</SelectItem>
                                    <SelectItem value="input:desc">Highest input price</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </FramePanel>
                <FramePanel className="p-0">
                    <DataGridScrollArea orientation="horizontal">
                        <DataGridTable />
                    </DataGridScrollArea>
                </FramePanel>
                <FrameFooter>
                    <DataGridPagination sizes={[5, 10, 25]} />
                </FrameFooter>
            </Frame>
        </DataGrid>
    );
}
