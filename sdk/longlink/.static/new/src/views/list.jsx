const files = [
    { type: 'png', filename: 'example.png' },
    { type: 'jpg', filename: 'garden.jpg' },
    { type: 'gif', filename: 'example.gif' },
    { type: 'webp', filename: 'example.webp' },
    { type: 'pdf', filename: 'example.pdf' },
    { type: 'txt', filename: 'example.txt' },
    { type: 'py', filename: 'example.py' },
    { type: 'json', filename: 'example.json' },
    { type: 'tsx', filename: 'example.tsx' },
    { type: 'yaml', filename: 'example.yaml' }
];

/** Lists bundled file types with on-demand preview dialogs. */
export default function List() {
    const [search, setSearch] = useState('');
    const [sorting, setSorting] = useState([{ id: 'filename', desc: false }]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const term = search.trim().toLowerCase();
    const filtered = files.filter((file) => file.filename.includes(term));

    const columns = [
        {
            accessorKey: 'filename',
            header: ({ column }) => <DataGridColumnHeader column={column} title="File" />,
            cell: ({ row }) => (
                <AttachmentLink href={`/assets/${row.original.filename}`} preview={row.original.filename}>
                    <span className="inline-flex items-center gap-2">
                        <FileType type={row.original.type} size="xs" aria-hidden="true" />
                        {row.original.filename}
                    </span>
                </AttachmentLink>
            )
        },
        {
            accessorKey: 'type',
            header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
            cell: ({ row }) => row.original.type.toUpperCase()
        }
    ];

    const table = useTable({
        features: dataGridFeatures,
        data: filtered,
        columns,
        getRowId: (file) => file.filename,
        state: { sorting, pagination },
        onSortingChange: setSorting,
        onPaginationChange: setPagination
    });

    // Reuse scoped attachment previews without owning dialog or file-loading state.
    return (
        <Stack padding={2}>
            <DataGrid
                table={table}
                recordCount={filtered.length}
                tableLayout={{ dense: true, headerBackground: false, rowBorder: true }}
                emptyMessage={
                    <div className="flex flex-col items-center gap-3 py-10">
                        <p>No files found</p>
                        <Button type="button" size="sm" variant="outline" onClick={() => setSearch('')}>
                            Clear search
                        </Button>
                    </div>
                }
            >
                <Frame variant="ghost" stacked dense spacing="sm" className="min-w-0">
                    <FrameHeader>
                        <InputGroup className="w-full md:max-w-96">
                            <InputGroupAddon>
                                <Icon icon="search" size="sm" />
                            </InputGroupAddon>
                            <InputGroupInput
                                aria-label="Search files"
                                placeholder="Search files"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                                }}
                            />
                        </InputGroup>
                    </FrameHeader>
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
        </Stack>
    );
}
