/** Formats a model context window for display. */
function formatContext(context) {
    return context >= 1000000 ? `${context / 1000000}M` : `${context / 1000}k`;
}

/** Keeps bookmark persistence within this Solution's View. */
function readBookmarks() {
    try {
        const value = JSON.parse(localStorage.getItem('longlink:model-bookmarks') ?? '[]');
        return Array.isArray(value) && value.every((id) => typeof id === 'string') ? value : [];
    } catch {
        return [];
    }
}

/** Displays the model's available input and output modalities. */
function Modalities({ modalities }) {
    return (
        <div className="flex items-center gap-2">
            {modalities.map((modality) => (
                <span
                    key={modality}
                    role="img"
                    aria-label={`${modality} input/output`}
                    title={`${modality} input/output`}
                >
                    <Icon
                        icon={modality === 'image' ? 'image' : modality === 'audio' ? 'volume-2' : 'type'}
                        size="sm"
                    />
                </span>
            ))}
        </div>
    );
}

/** Saves a model without navigating away from the current results. */
function SaveModel({ model, saved, onSave }) {
    return (
        <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`${saved ? 'Unsave' : 'Save'} ${model.name}`}
            aria-pressed={saved}
            onClick={onSave}
        >
            <Icon icon={saved ? 'bookmark-check' : 'bookmark'} size="sm" />
        </Button>
    );
}

/** Presents the selected model without losing the directory's filters or page. */
function ModelDetail({ model, saved, onSave, onBack }) {
    const [copyState, setCopyState] = useState('idle');

    /** Copies the model identifier and retains a readable fallback on failure. */
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
                <Icon icon="arrow-left" size="sm" />
                Back
            </Button>
            <div className="flex items-start gap-3">
                <IconTile size="sm" variant="outline">
                    <span className="text-xs font-semibold">{model.provider.slice(0, 2)}</span>
                </IconTile>
                <div className="flex min-w-0 flex-1 flex-col">
                    <h1 className="text-xl font-medium">{model.name}</h1>
                    <p className="text-xs text-muted-foreground">{model.provider.toLowerCase()}</p>
                </div>
                <SaveModel model={model} saved={saved} onSave={onSave} />
            </div>
            <p className="text-sm text-muted-foreground">{model.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
                <Icon icon="star" size="sm" />
                <span className="tabular-nums">{model.rating.toFixed(1)}</span>
                <Badge variant="secondary">{model.reviews} reviews</Badge>
                <Modalities modalities={model.modalities} />
            </div>
            <Collapsible defaultOpen>
                <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" />}>
                    Technical details
                    <Icon icon="chevron-down" size="sm" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="flex flex-col gap-3 pt-3">
                        <Button type="button" variant="outline" size="sm" className="self-start" onClick={copyId}>
                            <Icon icon={copyState === 'copied' ? 'check' : 'copy'} size="sm" />
                            Copy ID
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

/** Presents model discovery, bookmarks, details, and CSV export. */
export default function List() {
    const [models] = useApi('/assets/models.json');
    const download = useDownload();
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState(() => createFilterQuery());
    const [sorting, setSorting] = useState([{ id: 'name', desc: false }]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [bookmarks, setBookmarks] = useState(readBookmarks);
    const [detail, setDetail] = useState(null);

    // Bookmarks remain usable in memory when isolated storage is unavailable.
    useEffect(() => {
        try {
            localStorage.setItem('longlink:model-bookmarks', JSON.stringify(bookmarks));
        } catch {
            return;
        }
    }, [bookmarks]);

    const fields = [
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
    ];

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

    /** Updates bookmark state independently of row navigation. */
    function save(model) {
        setBookmarks((current) =>
            current.includes(model.id) ? current.filter((id) => id !== model.id) : [...current, model.id]
        );
    }

    /** Restores the full result set and a valid first page. */
    function clearFilters() {
        setSearch('');
        setQuery(createFilterQuery());
        setPagination((current) => ({ ...current, pageIndex: 0 }));
    }

    const columns = [
        {
            accessorKey: 'name',
            size: 560,
            minSize: 300,
            header: ({ column }) => <DataGridColumnHeader column={column} title="Model" />,
            cell: ({ row }) => (
                <div className="flex items-center gap-2.5">
                    <IconTile size="sm" variant="outline">
                        <span className="text-xs font-semibold">{row.original.provider.slice(0, 2)}</span>
                    </IconTile>
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <a
                            href={`#${row.original.id}`}
                            className="text-sm font-medium hover:underline"
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
                    <Icon icon="star" size="sm" />
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
            cell: ({ row }) => <Modalities modalities={row.original.modalities} />
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
    ];

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

    return (
        <Stack padding={4}>
            {detail ? (
                <ModelDetail
                    key={detail.id}
                    model={detail}
                    saved={bookmarks.includes(detail.id)}
                    onSave={() => save(detail)}
                    onBack={() => setDetail(null)}
                />
            ) : (
                <DataGrid
                    table={table}
                    recordCount={filtered.length}
                    tableLayout={{ headerBackground: false, rowBorder: true }}
                    tableClassNames={{ base: 'min-w-[1115px]', body: 'bg-background' }}
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
                                <ActionButton
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        await download.download(
                                            `/api/models/export?ids=${encodeURIComponent(sortedIds.join(','))}`,
                                            'models.csv'
                                        );
                                    }}
                                >
                                    <Icon icon="download" size="sm" />
                                    Export
                                </ActionButton>
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
                                        <Icon icon="search" size="sm" />
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
                                            <InputGroupButton
                                                size="icon-xs"
                                                aria-label="Clear search"
                                                onClick={() => {
                                                    setSearch('');
                                                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                                                }}
                                            >
                                                <Icon icon="x" size="sm" />
                                            </InputGroupButton>
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
                                <div className="ms-auto">
                                    <Select
                                        value={currentSort}
                                        onValueChange={(value) => {
                                            if (!value) return;
                                            const [id, direction] = value.split(':');
                                            setSorting(value === 'default' ? [] : [{ id, desc: direction === 'desc' }]);
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
            )}
        </Stack>
    );
}
