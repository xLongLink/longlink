/** Displays an invoice, its attachments, and its approval controls. */
export default function Invoice() {
    const [status, setStatus] = React.useState();
    const [open, setOpen] = React.useState(false);
    const [file, setFile] = React.useState(null);

    // Read required data; shared boundaries handle initial loading and failures.
    const item = useApi(`/api/items/${params.item}`);
    const attachments = useApi(`/api/items/${params.item}/attachments`);

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
                        data={attachments}
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
