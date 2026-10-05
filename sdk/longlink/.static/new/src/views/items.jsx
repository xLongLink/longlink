/** Displays invoice approvals using the shared, isolated LongLink frontend. */
export default function Invoices() {
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState({ name: '', price: 0, status: 'draft' });
    const [invoices] = useApi(`/api/items?page=${page}&page_size=8`);

    return (
        <Stack gap={8}>
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Heading level={1}>Invoice approvals</Heading>
                <Button label="New Invoice" clickAction={() => setOpen(true)} />
            </Stack>
            <Dialog aria-label="New Invoice" isOpen={open} onOpenChange={setOpen} purpose="form">
                <Stack gap={3}>
                    <Heading level={2}>New Invoice</Heading>
                    <TextInput
                        label="Invoice number"
                        value={draft.name}
                        onChange={(name) => setDraft({ ...draft, name })}
                    />
                    <NumberInput
                        label="Amount (CHF)"
                        value={draft.price}
                        min={0}
                        onChange={(price) => setDraft({ ...draft, price: price ?? 0 })}
                    />
                    <Selector
                        label="Status"
                        value={draft.status}
                        onChange={(status) => setDraft({ ...draft, status: status ?? 'draft' })}
                        options={[
                            { value: 'draft', label: 'Draft' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'approved', label: 'Approved' },
                        ]}
                    />
                    <Button
                        label="Create Invoice"
                        variant="primary"
                        clickAction={async () => {
                            await request('/api/items', { method: 'POST', json: draft });
                            setOpen(false);
                        }}
                    />
                </Stack>
            </Dialog>
            <Table
                data={invoices.items}
                idKey="id"
                density="compact"
                columns={[
                    {
                        key: 'name',
                        header: 'Invoice',
                        renderCell: (row) => (
                            <Stack gap={0}>
                                <Stack direction="horizontal" align="center" gap={2} wrap="wrap">
                                    <Link to={`/items/${row.id}`}>{row.name}</Link>
                                    <Badge
                                        variant={
                                            row.status === 'approved'
                                                ? 'success'
                                                : row.status === 'pending'
                                                  ? 'warning'
                                                  : 'neutral'
                                        }
                                        label={row.status}
                                    />
                                </Stack>
                                <Stack direction="horizontal" align="center" gap={0}>
                                    {row.created_at && (
                                        <>
                                            <Text color="secondary">
                                                <Timestamp value={row.created_at} format="date" />
                                            </Text>
                                            <Text color="secondary">-</Text>
                                        </>
                                    )}
                                    <Text color="secondary">
                                        <Currency value={row.price} currency="CHF" locale="de-CH" />
                                    </Text>
                                </Stack>
                            </Stack>
                        ),
                    },
                    {
                        key: 'created_by',
                        header: 'Created by',
                        renderCell: (row) =>
                            row.created_by ? (
                                <Stack direction="horizontal" align="center" gap={3}>
                                    <Avatar src={row.created_by.avatar} name={row.created_by.name} />
                                    <Stack gap={0}>
                                        <Text>{row.created_by.name}</Text>
                                        <Text color="secondary">{row.created_by.email}</Text>
                                    </Stack>
                                </Stack>
                            ) : (
                                'Unknown'
                            ),
                    },
                    {
                        key: 'approved_by',
                        header: 'Approved by',
                        renderCell: (row) =>
                            row.approved_by ? (
                                <Stack direction="horizontal" align="center" gap={3}>
                                    <Avatar src={row.approved_by.avatar} name={row.approved_by.name} />
                                    <Stack gap={0}>
                                        <Text>{row.approved_by.name}</Text>
                                        <Text color="secondary">{row.approved_by.email}</Text>
                                    </Stack>
                                </Stack>
                            ) : (
                                '—'
                            ),
                    },
                ]}
            />
            <Stack direction="horizontal" gap={2} justify="between">
                <Button label="Previous" isDisabled={page === 1} clickAction={() => setPage(page - 1)} />
                <Button label="Next" isDisabled={invoices.total <= page * 8} clickAction={() => setPage(page + 1)} />
            </Stack>
        </Stack>
    );
}
