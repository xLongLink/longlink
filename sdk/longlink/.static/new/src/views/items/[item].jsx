/** Displays an invoice, its attachments, and its approval controls. */
export default function Invoice() {
    const [status, setStatus] = React.useState();
    const [open, setOpen] = React.useState(false);
    const [file, setFile] = React.useState(null);
    const client = useQueryClient();
    const invoice = useQuery({ queryKey: ['item', params.item], queryFn: () => request(`/api/items/${params.item}`) });
    const attachments = useQuery({
        queryKey: ['attachments', params.item],
        queryFn: () => request(`/api/items/${params.item}/attachments`),
    });

    // Use explicit React state and controlled values instead of implicit writable strings.
    if (invoice.isPending || attachments.isPending) return <Spinner label="Loading invoice" />;
    if (invoice.isError || attachments.isError) return <Banner status="error" title="Invoice could not be loaded" />;
    const item = invoice.data;

    return (
        <Stack gap={6}>
            <Stack direction="horizontal" justify="between" align="start" gap={4}>
                <Stack gap={2}>
                    <Heading level={1}>{item.name}</Heading>
                    <Text color="secondary">
                        <Currency value={item.price} currency="CHF" locale="de-CH" />
                    </Text>
                    {item.created_at && <Timestamp value={item.created_at} format="date" />}
                </Stack>
                <Button label="Upload document" clickAction={() => setOpen(true)} />
            </Stack>
            <Dialog aria-label="Upload Invoice Document" isOpen={open} onOpenChange={setOpen} purpose="form">
                <Stack gap={3}>
                    <Heading level={2}>Upload Invoice Document</Heading>
                    <FileInput label="Invoice document" value={file} onChange={setFile} />
                    <Button
                        label="Upload document"
                        variant="primary"
                        isDisabled={!file}
                        clickAction={async () => {
                            await request(`/api/items/${params.item}/attachments`, {
                                method: 'POST',
                                form: [['file', file]],
                            });
                            await client.invalidateQueries({ queryKey: ['attachments', params.item] });
                            setOpen(false);
                            setFile(null);
                        }}
                    />
                </Stack>
            </Dialog>
            <Divider />
            <Grid columns={3} gap={8}>
                <GridSpan columns={2}>
                    <Table
                        data={attachments.data}
                        idKey="id"
                        density="compact"
                        columns={[
                            {
                                key: 'name',
                                header: 'File',
                                renderCell: (row) => (
                                    <FileViewer
                                        src={`/api/items/${params.item}/attachments/${row.id}`}
                                        title={row.name}
                                    />
                                ),
                            },
                            { key: 'size', header: 'Size', align: 'end', renderCell: (row) => `${row.size} B` },
                        ]}
                    />
                </GridSpan>
                <Stack gap={4}>
                    <Selector
                        label="Status"
                        value={status ?? item.status}
                        onChange={setStatus}
                        options={[
                            { value: 'draft', label: 'Draft' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'approved', label: 'Approved' },
                        ]}
                    />
                    {status !== undefined && status !== item.status && (
                        <Button
                            label="Save status"
                            variant="primary"
                            clickAction={async () => {
                                await request(`/api/items/${params.item}/status`, {
                                    method: 'PATCH',
                                    json: { status },
                                });
                                await client.invalidateQueries({ queryKey: ['item', params.item] });
                                setStatus(undefined);
                            }}
                        />
                    )}
                    {item.approved_by && (
                        <Stack gap={2}>
                            <Text color="secondary">Approved by</Text>
                            <Avatar name={item.approved_by.name} />
                            <Text>{item.approved_by.name}</Text>
                        </Stack>
                    )}
                </Stack>
            </Grid>
        </Stack>
    );
}
