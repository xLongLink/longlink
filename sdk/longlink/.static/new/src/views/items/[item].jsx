/**
 * Displays an invoice, its attachments, and its approval controls.
 * @param {ViewProps} props
 */
export default function Invoice({ params }) {
    const [status, setStatus] = useState();
    const [open, setOpen] = useState(false);

    // Read required data; shared boundaries handle initial loading and failures.
    const [item] = useApi(`/api/items/${params.item}`);
    const [attachments] = useApi(`/api/items/${params.item}/attachments`);

    return (
        <Stack gap={6}>
            <Stack direction="horizontal" justify="between" align="start" wrap="wrap" gap={4}>
                <Stack gap={0}>
                    <Heading level={1}>{item.name}</Heading>
                    <Stack direction="horizontal" align="center" gap={0}>
                        {item.created_at && (
                            <>
                                <Text color="secondary">
                                    <Timestamp value={item.created_at} format="date" />
                                </Text>
                                <Text color="secondary">-</Text>
                            </>
                        )}
                        <Text color="secondary">
                            <Currency value={item.price} currency="CHF" locale="de-CH" />
                        </Text>
                    </Stack>
                </Stack>
                <Button label="Upload document" onClick={() => setOpen(true)} />
            </Stack>
            <Dialog aria-label="Upload Invoice Document" isOpen={open} onOpenChange={setOpen} purpose="form">
                <Form action={`/api/items/${params.item}/attachments`} method="post" onSuccess={() => setOpen(false)}>
                    <Stack gap={3}>
                        <Heading level={2}>Upload Invoice Document</Heading>
                        <FileInput name="file" label="Invoice document" required />
                        <Button label="Upload document" variant="primary" type="submit" />
                    </Stack>
                </Form>
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
                            onClick={async () => {
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
                            <Avatar src={item.approved_by.avatar} name={item.approved_by.name} />
                            <Text>{item.approved_by.name}</Text>
                        </Stack>
                    )}
                </Stack>
            </Grid>
        </Stack>
    );
}
