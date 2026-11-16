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
    const filtered = useMemo(() => files.filter((file) => file.filename.includes(term)), [term]);

    const columns = [
        {
            accessorKey: 'filename',
            header: ({ column }) => <DataGridColumnHeader column={column} title="File" />,
            cell: ({ row }) => (
                <Link href={`/assets/${row.original.filename}`} preview={row.original.filename}>
                    <Text className="inline-flex items-center gap-2">
                        <FileType type={row.original.type} size="xs" aria-hidden="true" />
                        {row.original.filename}
                    </Text>
                </Link>
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
                    <Empty title="No files found">
                        <Button type="button" size="sm" variant="outline" onClick={() => setSearch('')}>
                            Clear search
                        </Button>
                    </Empty>
                }
            >
                <Frame
                    variant="ghost"
                    stacked
                    dense
                    spacing="sm"
                    padding="none"
                    action={
                        <Box width={384} maxWidth="100%">
                            <Input
                                aria-label="Search files"
                                placeholder="Search files"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                                }}
                            />
                        </Box>
                    }
                    footer={<DataGridPagination sizes={[5, 10, 25]} />}
                >
                    <DataGridScrollArea orientation="horizontal">
                        <DataGridTable />
                    </DataGridScrollArea>
                </Frame>
            </DataGrid>
        </Stack>
    );
}
