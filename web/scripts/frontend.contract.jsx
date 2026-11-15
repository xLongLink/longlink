const anchor = useComboboxAnchor();

const [selected, setSelected] = useState('one');
const remembered = useRef(/** @type {HTMLButtonElement | null} */ (null));
const formRef = useRef(/** @type {HTMLFormElement | null} */ (null));
const linkRef = useRef(/** @type {HTMLAnchorElement | null} */ (null));
useEffect(() => {}, []);
const label = useMemo(() => selected.toUpperCase(), [selected]);
const confirmation = useConfirm();
confirmation.show({ title: 'Publish changes?', actionLabel: 'Publish', actionVariant: 'default', onAction: async () => {} });

const records = [{ id: 'shipment', name: 'Shipment', price: 2 }];
const [sorting, setSorting] = useState(/** @type {SortingState} */ ([]));
const [rowSelection, setRowSelection] = useState(/** @type {RowSelectionState} */ ({}));
/** @type {ColumnDef<DataGridFeatures, (typeof records)[number]>[]} */
const columns = [
    { id: 'selection', header: () => <DataGridTableRowSelectAll />, cell: ({ row }) => <DataGridTableRowSelect row={row} /> },
    { accessorKey: 'name', header: ({ column }) => <DataGridColumnHeader column={column} title="Name" /> },
    { accessorKey: 'price', header: ({ column }) => <DataGridColumnHeader column={column} title="Price" /> }
];
const table = useTable({
    features: dataGridFeatures,
    manualPagination: true,
    data: records,
    columns,
    enableRowSelection: true,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id
});
const query = createFilterQuery();
const downloads = useDownload();
const icon = <Icon icon="triangle-exclamation-point" size="sm" />;
const token = <Token icon="user-round" label="Owner" />;
const fileType = <FileType type="pdf" variant="solid" size="md" icon={icon} label={null} aria-label="Invoice PDF" />;
const menuItem = <MenuItem icon="refresh-cw" label="Automation" />;
// @ts-expect-error LongLink aliases are not Lucide names.
const legacyIcon = <Icon icon="close" size="sm" />;
// @ts-expect-error Icon names do not accept a provider prefix.
const prefixedIcon = <Icon icon="lucide:search" size="sm" />;
const nativeGrid = (
    <DataGrid table={table} recordCount={records.length}>
        <Frame>
            <FrameHeader><FrameTitle>Shipments</FrameTitle></FrameHeader>
            <FramePanel><DataGridScrollArea><DataGridTable /></DataGridScrollArea></FramePanel>
            <FrameFooter><DataGridPagination /></FrameFooter>
        </Frame>
    </DataGrid>
);
const configuredTable = (
    <DataGrid
        table={table}
        recordCount={records.length}
        emptyMessage={<Button onClick={async () => { await downloads.download('/api/export', 'shipments.csv'); }}>Export</Button>}
    >
        <DataGridContainer>
            <DataGridScrollArea><DataGridTable /></DataGridScrollArea>
        </DataGridContainer>
    </DataGrid>
);
const filters = <Filters fields={[]} query={query} onQueryChange={(next) => flattenFilterConditions(next)} />;

const nativeComposition = (
    <Card id="settings" onPointerDown={(event) => event.currentTarget.focus()}>
        <CardHeader>
            <CardTitle>{label}</CardTitle>
            <CardDescription>Settings</CardDescription>
        </CardHeader>
        <CardContent>
            <Calendar mode="range" onSelect={(range) => range?.from?.getDate()} />
            <Calendar mode="multiple" onSelect={(dates) => dates?.map((date) => date.getDate())} />
            <Currency value={1234.5} currency="USD" locale="en-US" aria-label="Total" onClick={(event) => event.currentTarget.focus()} />
            <Timestamp value="2026-10-02T12:00:00Z" format="relative" aria-label="Updated" onClick={(event) => event.currentTarget.focus()} />
            <Text
                id="publication-status"
                role="status"
                aria-live="polite"
                data-publication="current"
                onClick={(event) => event.currentTarget.focus()}
            >
                Ready to publish
            </Text>
            <AvatarGroup aria-label="Accounts">
                <Avatar size="md" name="Account" src="/account.png" />
                <Avatar shape="rounded" name="Acme" />
            </AvatarGroup>
            <Box width={320} maxWidth="100%" minHeight={120} background="outline">
            <Stack
                aria-label="Preview"
                gap={4}
                onFocus={(event) => event.currentTarget.focus()}
            >
                <Grid id="preview" columns={2}>
                    <GridItem columns="full"><Text>Preview</Text></GridItem>
                </Grid>
            </Stack>
            </Box>
            <Separator orientation="vertical" id="account-divider" aria-label="Account sections" />
            <FieldSeparator><a href="/login">Sign in</a></FieldSeparator>
            <Link
                ref={linkRef}
                href="/orders"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Orders"
                onClick={(event) => event.currentTarget.href.trim()}
            >
                <span>Orders</span>
            </Link>
            <Link href="/api/report" download="report.pdf">
                Download report
            </Link>
            <Link onClick={async (event) => { event.currentTarget.focus(); }}>Run action</Link>
            <Link href="/api/report" preview="report.pdf">Preview</Link>
            <ButtonGroup aria-label="Actions" orientation="vertical">
                <Button>Save</Button>
                <Button>Cancel</Button>
            </ButtonGroup>
            <Dialog
                defaultOpen={false}
                onOpenChange={(open, details) => {
                    open.valueOf();
                    details.cancel();
                }}
            >
                <DialogTrigger render={<Button />}>Open</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Details</DialogTitle>
                        <DialogDescription>Review the order.</DialogDescription>
                    </DialogHeader>
                    <DialogClose render={<Button />}>Close</DialogClose>
                </DialogContent>
            </Dialog>
            <Pagination aria-label="Pages">
                <PaginationContent>
                    <PaginationItem><PaginationLink href="?page=1" isActive>1</PaginationLink></PaginationItem>
                    <PaginationItem><PaginationNext href="?page=2" /></PaginationItem>
                </PaginationContent>
            </Pagination>
            <DataPagination page={1} onPageChange={(page) => page.toFixed()} totalItems={50} pageSize={10} />
            <Field>
                <FieldLabel htmlFor="native-name">Name</FieldLabel>
                <Input
                    id="native-name"
                    type="url"
                    name="website"
                    onChange={(event) => event.currentTarget.value.trim()}
                />
                <Textarea name="notes" onChange={(event) => event.currentTarget.value.trim()} />
                <InputGroup>
                    <InputGroupInput name="search" />
                    <InputGroupAddon>
                        <InputGroupText>Search</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </Field>
            <Switch
                checked
                onCheckedChange={(checked, details) => {
                    checked.valueOf();
                    details.cancel();
                }}
                size="sm"
            />
            <Field orientation="horizontal">
                <Switch id="notifications" defaultChecked />
                <FieldLabel htmlFor="notifications">Notifications</FieldLabel>
            </Field>
            <Field>
                <FieldLabel htmlFor="appointment-time">Appointment time</FieldLabel>
                <TimePicker
                    id="appointment-time"
                    name="appointment"
                    defaultValue="09:30"
                    hourCycle={24}
                    granularity="minute"
                    min="09:00"
                    max="17:00"
                    required
                    onValueChange={(value) => value?.trim()}
                >
                    <TimePickerInput onBlur={(event) => event.currentTarget.checkValidity()} />
                    <TimePickerContent>
                        <TimePickerColumns />
                        <TimePickerFooter>
                            <TimePickerNow />
                            <TimePickerClear />
                            <TimePickerConfirm />
                        </TimePickerFooter>
                    </TimePickerContent>
                </TimePicker>
            </Field>
            <RadioGroup
                name="plan"
                value={selected}
                onValueChange={(value, details) => {
                    setSelected(value);
                    details.cancel();
                }}
            >
                <Field orientation="horizontal">
                    <RadioGroupItem id="native-plan" value="one" />
                    <FieldLabel htmlFor="native-plan">Solo</FieldLabel>
                </Field>
            </RadioGroup>
            <Checkbox
                indeterminate
                onCheckedChange={(checked, details) => {
                    checked.valueOf();
                    details.cancel();
                }}
            />
            <Dropdown
                open={selected === 'menu'}
                onOpenChange={(open, details) => {
                    details.cancel();
                    setSelected(open ? 'menu' : 'one');
                }}
            >
                <DropdownTrigger>Actions</DropdownTrigger>
                <DropdownContent>
                    <DropdownCheckboxItem
                        checked
                        onCheckedChange={(checked, details) => {
                            checked.valueOf();
                            details.cancel();
                        }}
                    >
                        Notifications
                    </DropdownCheckboxItem>
                </DropdownContent>
            </Dropdown>
            <Button nativeButton={false} render={<Link href="/orders" />}>
                Open orders
            </Button>
            <Table aria-label="Orders" wrap>
                <TableCaption>Open orders</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead scope="col" align="end">Reference</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow onClick={(event) => event.currentTarget.focus()}>
                        <TableCell colSpan={2} align="end">PO-871</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            <Empty aria-label="Search results" title="No matching orders" description="Change the search filters." />
            <Wizard>
                <Step label="Details">Draft</Step>
            </Wizard>
            <Badge onAnimationStart={(event) => event.currentTarget.focus()}>
                Ready
            </Badge>
            <Token label="Priority" size="xs" />
            <Token label="Priority" size="sm" />
            <Token label="Priority" size="md" />
            <Token label="Priority" size="lg" />
            <Token label="Priority" size="xl" />
            <Button
                ref={remembered}
                formAction="/save"
                variant="outline"
                onClick={async (event) => {
                    event.currentTarget.checkValidity();
                }}
            >
                Save
            </Button>
            <ButtonGroup aria-label="Actions">
                <Button
                    aria-label="Approve"
                    size="icon-xs"
                    variant="outline"
                    onClick={async (event) => {
                        event.currentTarget.focus();
                    }}
                >
                    <Icon icon="check" size="sm" />
                </Button>
            </ButtonGroup>
            <FileViewer src="/attachment" title="Attachment" />
            <Tabs value={selected} onValueChange={(value) => setSelected(String(value))}>
                <TabsList variant="line">
                    <TabsTrigger value="one">One</TabsTrigger>
                </TabsList>
                <TabsContent value="one">Content</TabsContent>
            </Tabs>
            <Slider
                defaultValue={[10, 20]}
                onValueChange={(value, details) => {
                    value.map(Math.round);
                    details.cancel();
                }}
            />
            <Slider aria-label="Level" defaultValue={10} onValueChange={(value) => value.toFixed()}>
                <SliderControl>
                    <SliderTrack>
                        <SliderRange />
                    </SliderTrack>
                    <SliderThumb index={0} />
                </SliderControl>
            </Slider>
            <Progress value={50} label="Progress" showValue />
            <Select items={[{ value: 'one', label: 'One' }]} defaultValue="one">
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="one">One</SelectItem>
                </SelectContent>
            </Select>
            <Select
                multiple
                name="teams"
                defaultValue={['design']}
                onValueChange={(values, details) => {
                    values.map((value) => value.toUpperCase());
                    details.cancel();
                }}
            >
                <SelectTrigger aria-label="Teams">
                    <SelectValue placeholder="Select teams" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                </SelectContent>
            </Select>
            <Combobox items={['One', 'Two']}>
                <ComboboxInput />
                <ComboboxContent anchor={anchor}>
                    <ComboboxList>
                        {(item) => (
                            <ComboboxItem key={item} value={item}>
                                {item}
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </CardContent>
        <CardFooter>Actions</CardFooter>
    </Card>
);

const formSchema = z.object({ name: z.string().trim().min(1) });
/** @type {z.infer<typeof formSchema>} */
const schemaValue = { name: 'Order' };
// @ts-expect-error Zod's namespace types must retain schema inference in standalone SDK declarations.
schemaValue.name = 42;
const orderForm = useForm({ resolver: zodResolver(formSchema), defaultValues: { name: '' } });
// @ts-expect-error Controller names must match the form's values.
const unknownField = <Controller name="missing" control={orderForm.control} render={() => <div />} />;
const convertedForm = useForm({
    resolver: zodResolver(z.object({ quantity: z.string().transform(Number) })),
    defaultValues: { quantity: '3' }
});
convertedForm.handleSubmit((values) => {
    values.quantity.toFixed();
    // @ts-expect-error A resolver transformation must change the submitted value's type.
    values.quantity.toUpperCase();
});
const submitOrder = useSubmit('/api/orders', { method: 'PATCH' });
const nativeForm = (
    <FormProvider {...orderForm}>
    <form
        ref={formRef}
        id="order"
        className="w-full"
        style={{ maxWidth: 640 }}
        aria-label="Order"
        onSubmit={orderForm.handleSubmit(async (values) => {
            const data = new FormData();
            data.append('name', values.name);
            await submitOrder(data);
        })}
        noValidate
    >
        <FieldGroup>
            <Controller name="name" control={orderForm.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="order-name">Name</FieldLabel>
                <Input {...field} id="order-name" aria-invalid={fieldState.invalid} />
                <FieldError errors={[fieldState.error]} />
            </Field>
            )} />
        </FieldGroup>
    </form>
    </FormProvider>
);

const _adapters = (
    <InteractiveCard size="sm" isSelected onChange={() => {}}>
        <CardContent>
            <Dialog fullscreen open onOpenChange={() => {}}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Title</DialogTitle>
                    </DialogHeader>
                    {nativeComposition}
                </DialogContent>
            </Dialog>
        </CardContent>
    </InteractiveCard>
);

// @ts-expect-error Native variants must not silently accept arbitrary strings.
const _badVariant = <Badge variant="not-a-variant" />;
// @ts-expect-error Native Button no longer accepts the legacy label adapter.
const _legacyButton = <Button label="Save" />;
// @ts-expect-error Native Separator has no LongLink full-bleed policy.
const _legacySeparator = <Separator isFullBleed />;
// @ts-expect-error Slider inference must preserve numeric scalar values.
const _badSlider = <Slider defaultValue={10} onValueChange={(value) => value.map(Math.round)} />;
// @ts-expect-error Native Table accepts HTML composition, not the data adapter contract.
const _legacyTable = <Table data={[{ name: 'Order' }]} />;
// @ts-expect-error Dropdown does not accept data-driven action items.
const _legacyMenu = <Dropdown items={[]} />;

// @ts-expect-error Native ButtonGroup does not coordinate the custom disabled group contract.
const _customGroupProps = <ButtonGroup isDisabled />;
// @ts-expect-error Native Dialog does not accept the framed visibility contract.
const _customDialogProps = <Dialog isOpen open onOpenChange={() => {}} />;
// @ts-expect-error Ordinary links use the native href property.
const _legacyLink = <Link to="/orders">Orders</Link>;
// @ts-expect-error A file action cannot preview and download simultaneously.
const _conflictingLinkActions = <Link href="/api/report" preview="report.pdf" download="report.pdf">Report</Link>;
// @ts-expect-error Scoped file actions require a path.
const _missingFilePath = <Link preview="report.pdf">Preview</Link>;
// @ts-expect-error A link requires a destination or an action.
const _missingLinkAction = <Link>Report</Link>;
// @ts-expect-error Native Pagination is composed from anchors, not the custom data pagination contract.
const _customPaginationProps = <Pagination page={1} totalItems={50} pageSize={10} onPageChange={() => {}} />;

// @ts-expect-error Views select supported variants instead of overriding component classes.
const _buttonClasses = <Button className="bg-red-500" />;
// @ts-expect-error Authored inline styling is excluded from View components.
const _inputStyle = <Input style={{ color: 'red' }} />;
// @ts-expect-error Calendar slots retain their installed styling.
const _calendarClasses = <Calendar classNames={{ root: 'custom-calendar' }} />;
// @ts-expect-error Calendar style maps are excluded too.
const _calendarStyles = <Calendar styles={{ root: { color: 'red' } }} />;
// @ts-expect-error Calendar implementation replacement is not a View styling API.
const _calendarComponents = <Calendar components={{}} />;
// @ts-expect-error Nested-component class overrides are not exposed.
const _fileTypeClasses = <FileType type="pdf" labelClassName="text-red-500" />;
// @ts-expect-error The medium FileType size is named md.
const _fileTypeDefaultSize = <FileType type="pdf" size="default" />;
// @ts-expect-error DataGrid styling cannot be overridden through its slot map.
const _gridClasses = <DataGrid recordCount={0} tableClassNames={{ body: 'custom-body' }} />;
/** @type {ColumnDef<DataGridFeatures, { name: string }>} */
const _columnClasses = {
    accessorKey: 'name',
    meta: {
        // @ts-expect-error Column metadata cannot override installed cell styling.
        cellClassName: 'custom-cell'
    }
};
// @ts-expect-error Chart components retain their installed container styling.
const _chartStyle = <ChartContainer config={{}} style={{ height: 280 }}><AreaChart /></ChartContainer>;
// @ts-expect-error Recharts primitives also exclude arbitrary CSS.
const _seriesStyle = <Area dataKey="total" style={{ opacity: 0 }} />;
// @ts-expect-error Avatar geometry is selected through shape, not an owner kind.
const _avatarKind = <Avatar kind="organization" />;
// @ts-expect-error Avatar artwork uses a fixed internal seed.
const _avatarSeed = <Avatar seed="account-1" />;
// @ts-expect-error Avatar accessible text uses name or native ARIA attributes.
const _avatarAlt = <Avatar alt="Account" />;
// @ts-expect-error The medium Avatar size is named md.
const _avatarSize = <Avatar size="default" />;
// @ts-expect-error Text always renders a span; use Heading for a title.
const _textAs = <Text as="h4">Title</Text>;
// @ts-expect-error Text does not expose a ref.
const _textRef = <Text ref={null}>Details</Text>;
// @ts-expect-error Currency formatting cannot be replaced with children.
const _currencyChildren = <Currency value={1} currency="USD">Other amount</Currency>;
// @ts-expect-error Currency styling is owned by the component in Views.
const _currencyStyle = <Currency value={1} currency="USD" className="text-red-500" />;
// @ts-expect-error Timestamp does not expose a ref.
const _timestampRef = <Timestamp value={0} ref={null} />;
// @ts-expect-error Timestamp styling is owned by the component in Views.
const _timestampStyle = <Timestamp value={0} style={{ color: 'red' }} />;
// @ts-expect-error Button uses primary rather than the former default variant.
const _buttonDefaultVariant = <Button variant="default">Save</Button>;
const _buttonPrimaryVariant = <Button variant="primary">Save</Button>;
// @ts-expect-error DropdownContent styling is owned by the component.
const _dropdownContentClasses = <DropdownContent className="hidden" />;
// @ts-expect-error DropdownItem styling is owned by the component.
const _dropdownItemClasses = <DropdownItem className="hidden">Archive</DropdownItem>;
// @ts-expect-error Text no longer provides truncation tooltips.
const _textTooltip = <Text maxLines={1} hasTruncateTooltip>Details</Text>;
// @ts-expect-error Heading uses level for both its HTML element and accessible outline.
const _headingAccessibilityLevel = <Heading level={2} accessibilityLevel={1}>Title</Heading>;
// @ts-expect-error Heading does not expose a ref.
const _headingRef = <Heading ref={null}>Title</Heading>;
// @ts-expect-error Collapsible is not currently exposed to Views.
const _removedCollapsible = <Collapsible />;
// @ts-expect-error Stepper is not currently exposed to Views.
const _removedStepper = <Stepper />;

const _nativeCharts = (
    <>
        <ChartContainer
            config={{ total: { label: 'Total', color: 'var(--chart-1)' } }}
            aria-label="Revenue"
        >
            <AreaChart data={[{ period: 'January', total: 120 }]} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="period" />
                <YAxis />
                <Area dataKey="total" fill="var(--color-total)" stroke="var(--color-total)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
        </ChartContainer>
        <ChartContainer config={{}} aria-label="Revenue allocation">
            <Sankey
                data={{
                    nodes: [{ name: 'Revenue' }, { name: 'Profit' }],
                    links: [{ source: 0, target: 1, value: 40 }]
                }}
                node={{ fill: 'var(--chart-1)' }}
                link={({ sourceX, targetX, sourceY, targetY }) => (
                    <path d={`M ${sourceX},${sourceY} L ${targetX},${targetY}`} />
                )}
            />
        </ChartContainer>
    </>
);

// @ts-expect-error Charts use native marks and axes, not LongLink's category/series adapter.
const _legacyChart = <AreaChart data={[]} categoryKey="month" series={[]} />;
