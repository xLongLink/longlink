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
const icon = <Icon icon="triangle-exclamation-point" size="sm" tile="soft" variant="destructive" />;
const fileType = <FileType type="pdf" variant="solid" size="md" icon={icon} label={null} aria-label="Invoice PDF" />;
const menuItem = <MenuItem icon="refresh-cw" label="Automation" />;
const menuComposition = (
    <Menu gap={2.5}>
        <MenuSection title="Settings" isHeaderHidden>
            {menuItem}
            <MenuSubSection label="Workspace" icon="users">
                <MenuItem label="Members"><Text>Members</Text></MenuItem>
            </MenuSubSection>
        </MenuSection>
    </Menu>
);
// @ts-expect-error Menu styling is owned by the component.
const _menuClasses = <Menu className="hidden" />;
// @ts-expect-error Tabs styling is owned by the component.
const _tabsClasses = <Tabs className="hidden" />;
// @ts-expect-error Frame styling is owned by the component.
const _frameClasses = <Frame className="hidden" />;
// @ts-expect-error Frame owns its sections.
const _frameHeader = <Frame header={{ title: 'Files' }} />;
// @ts-expect-error Card uses flat header props.
const _cardHeader = <Card header={{ title: 'Files' }} />;
// @ts-expect-error Tab styling is owned by the component.
const _tabStyle = <Tab value="one" label="One" style={{ display: 'none' }} />;
// @ts-expect-error Tabs owns its focus behavior.
const _tabsActivateOnFocus = <Tabs activateOnFocus />;
// @ts-expect-error Tabs owns its focus behavior.
const _tabsLoopFocus = <Tabs loopFocus={false} />;
// @ts-expect-error Tab values must be strings.
const _tabNumericValue = <Tab value={1} label="One" />;
// @ts-expect-error Tabs values must be strings.
const _tabsNumericValue = <Tabs value={1} />;
// @ts-expect-error Tabs default values must be strings.
const _tabsNumericDefault = <Tabs defaultValue={1} />;
// @ts-expect-error Tabs always uses horizontal orientation.
const _tabsOrientation = <Tabs orientation="vertical" />;
// @ts-expect-error LongLink aliases are not Lucide names.
const legacyIcon = <Icon icon="close" size="sm" />;
// @ts-expect-error Icon names do not accept a provider prefix.
const prefixedIcon = <Icon icon="lucide:search" size="sm" />;
const nativeGrid = (
    <DataGrid table={table} recordCount={records.length}>
        <Frame title={<span>Shipments</span>} description="Recent shipments" action={<Button>Export</Button>} padding="none" footer={<DataGridPagination />}>
            <DataGridScrollArea><DataGridTable /></DataGridScrollArea>
        </Frame>
    </DataGrid>
);
const configuredTable = (
    <DataGrid
        table={table}
        recordCount={records.length}
        emptyMessage={<Link href="/api/export" download="shipments.csv">Export</Link>}
    >
        <DataGridContainer>
            <DataGridScrollArea><DataGridTable /></DataGridScrollArea>
        </DataGridContainer>
    </DataGrid>
);
const filters = <Filters fields={[]} query={query} onQueryChange={(next) => flattenFilterConditions(next)} />;

const nativeComposition = (
    <Card
        id="settings"
        title={<span>{label}</span>}
        description="Settings"
        action={<Button>More</Button>}
        footer={<Button onClick={() => {}}>Save</Button>}
        label="Open settings"
        onClick={(event) => event.currentTarget.focus()}
        onPointerDown={(event) => event.currentTarget.focus()}
    >
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
            <Box width={320} maxWidth="100%" minHeight={120} center background="outline">
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
            <a href="/login">Sign in</a>
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
                title="Details"
                description="Review the order."
                trigger={<Button>Open</Button>}
                footer={<Button onClick={() => setSelected('done')}>Done</Button>}
                defaultOpen={false}
                onOpenChange={(open, details) => {
                    open.valueOf();
                    details.cancel();
                }}
            >
                <Input label="Reference" />
            </Dialog>
            <Pagination aria-label="Pages">
                <PaginationContent>
                    <PaginationItem><PaginationLink href="?page=1" isActive>1</PaginationLink></PaginationItem>
                    <PaginationItem><PaginationNext href="?page=2" /></PaginationItem>
                </PaginationContent>
            </Pagination>
            <DataPagination page={1} onPageChange={(page) => page.toFixed()} totalItems={50} pageSize={10} />
                <Input
                    id="native-name"
                    label="Name"
                    description="Company website."
                    error="Enter a URL."
                    type="url"
                    name="website"
                    onChange={(event) => event.currentTarget.value.trim()}
                />
                <Textarea name="notes" onChange={(event) => event.currentTarget.value.trim()} />
                <Input name="search" label="Search" />
            <Switch
                checked
                onCheckedChange={(checked, details) => {
                    checked.valueOf();
                    details.cancel();
                }}
                size="sm"
            />
                <Switch id="notifications" label="Notifications" defaultChecked />
            <RadioGroup
                name="plan"
                label="Plan"
                options={[{ value: 'one', label: 'Solo' }]}
                value={selected}
                onValueChange={(value, details) => {
                    setSelected(value);
                    details.cancel();
                }}
            />
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
            <Tabs value={selected} variant="line" onValueChange={(value) => setSelected(String(value))}>
                <Tab value="one" label="One">Content</Tab>
            </Tabs>
            <Slider
                defaultValue={[10, 20]}
                onValueChange={(value, details) => {
                    value.map(Math.round);
                    details.cancel();
                }}
            />
            <Slider label="Level" defaultValue={10} onValueChange={(value) => value.toFixed()} />
            <Progress value={50} label="Progress" showValue />
            <Select options={[{ value: 'one', label: 'One' }]} defaultValue="one" onValueChange={(value) => value?.toUpperCase()} />
            <Select
                multiple
                name="teams"
                label="Teams"
                placeholder="Select teams"
                options={[{ value: 'design', label: 'Design' }, { value: 'engineering', label: 'Engineering' }]}
                defaultValue={['design']}
                onValueChange={(values, details) => {
                    values.map((value) => value.toUpperCase());
                    details.cancel();
                }}
            />
            <Combobox label="Assignee" options={[{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }]} onValueChange={(value) => value?.toUpperCase()} />
            <Combobox multiple label="Assignees" options={[{ value: 'one', label: 'One' }]} onValueChange={(values) => values.map((value) => value.toUpperCase())} />
    </Card>
);

const formSchema = z.object({ name: z.string().trim().min(1) });
/** @type {z.infer<typeof formSchema>} */
const schemaValue = { name: 'Order' };
// @ts-expect-error Zod's namespace types must retain schema inference in standalone SDK declarations.
schemaValue.name = 42;
const orderForm = useForm(formSchema, { defaultValues: { name: '' } });
const submittingForm = useForm(formSchema, {
    defaultValues: { name: '' },
    action: '/api/orders',
    method: 'PATCH',
    onSuccess: async (data) => { String(data); },
    onError: async (error) => { error.message.trim(); }
});
const automaticForm = <form onSubmit={submittingForm.submit}><Input {...submittingForm.register('name')} /></form>;
submittingForm.submit().then(() => {});
// @ts-expect-error Form actions must use write methods.
const readOnlySubmission = useForm(formSchema, { action: '/api/orders', method: 'GET' });
// @ts-expect-error Controller names must match the form's values.
const unknownField = <Controller name="missing" control={orderForm.control} render={() => <div />} />;
const convertedForm = useForm(z.object({ quantity: z.string().transform(Number) }), {
    defaultValues: { quantity: '3' }
});
convertedForm.setValue('quantity', '4');
// @ts-expect-error Editing values retain the schema's input type.
convertedForm.setValue('quantity', 4);
// @ts-expect-error Defaults describe editing inputs, not parsed outputs.
const invalidDefaults = useForm(z.object({ quantity: z.string().transform(Number) }), { defaultValues: { quantity: 3 } });
// @ts-expect-error Validation is owned by the schema, not a caller-provided resolver.
const customResolver = useForm(formSchema, { resolver: undefined });
// @ts-expect-error The schema is required as the first argument.
const missingSchema = useForm({ defaultValues: { name: '' } });
// @ts-expect-error Resolver composition is no longer part of the public View API.
const legacyResolver = zodResolver(formSchema);
const formWithDefaults = useForm(z.object({ enabled: z.boolean().default(false) }));
formWithDefaults.handleSubmit((values) => values.enabled.valueOf());
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
            <Controller name="name" control={orderForm.control} render={({ field, fieldState }) => (
                <Input {...field} label="Name" error={fieldState.error?.message} />
            )} />
    </form>
    </FormProvider>
);

const _adapters = (
    <Card size="sm" padding="none" isSelected onChange={() => {}}>
            <Dialog fullscreen title="Title" dismissible={false} open onOpenChange={() => {}}>
                    {nativeComposition}
            </Dialog>
    </Card>
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
// @ts-expect-error Dialog visibility uses open, not isOpen.
const _customDialogProps = <Dialog title="Details" isOpen open onOpenChange={() => {}} />;
// @ts-expect-error Dialog uses fullscreen rather than a size selector.
const _dialogSize = <Dialog title="Details" size="lg" />;
// @ts-expect-error Dialog requires an accessible title.
const _dialogTitle = <Dialog open />;
// @ts-expect-error Dialog presentation is owned internally.
const _dialogStyle = <Dialog title="Details" style={{ width: 900 }} />;
// @ts-expect-error Fullscreen is a boolean, not a size name.
const _dialogFullscreen = <Dialog title="Details" fullscreen="fullscreen" />;
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
// @ts-expect-error Option values are strings, not arbitrary objects.
const _selectObject = <Select options={[{ value: { id: 1 }, label: 'One' }]} />;
// @ts-expect-error Multiple selection requires an array value.
const _selectMultiple = <Select multiple options={[]} value="one" />;
// @ts-expect-error Combobox composition is internal.
const _comboboxChildren = <Combobox options={[]}><input /></Combobox>;
// @ts-expect-error Checkbox rendering is internal.
const _checkboxRender = <Checkbox render={<button />} />;
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
const _chartStyle = <BarChart data={[{ month: 'Jan', total: 1 }]} xKey="month" series={[{ key: 'total' }]} style={{ height: 280 }} />;
// @ts-expect-error Series must select numeric fields, not category labels.
const _seriesKey = <AreaChart data={[{ month: 'Jan', total: 1 }]} xKey="month" series={[{ key: 'month' }]} />;
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
// @ts-expect-error Card styling is owned by the component.
const _cardClasses = <Card className="hidden" />;
// @ts-expect-error Card styling is owned by the component.
const _cardStyle = <Card style={{ display: 'none' }} />;
// @ts-expect-error Card owns its content sections.
const _cardHeader = <CardHeader>Settings</CardHeader>;
// @ts-expect-error Card includes surface interactions without a separate component.
const _interactiveCard = <InteractiveCard onClick={() => {}} />;
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

const _charts = (
    <>
        <Box height={280}>
            <AreaChart data={[{ period: 'January', total: 120 }]} xKey="period" series={[{ key: 'total', label: 'Total' }]} axes legend tooltip padding={0} curve="linear" fill="gradient" aria-label="Revenue" />
            <BarChart data={[{ period: 'January', total: 120 }]} xKey="period" series={[{ key: 'total' }]} />
            <LineChart data={[{ period: 'January', total: null }, { period: 'February', total: 0 }]} xKey="period" series={[{ key: 'total' }]} />
            <RadarChart data={[{ category: 'Speed', total: 120 }]} categoryKey="category" series={[{ key: 'total' }]} />
            <PieChart data={[{ label: 'Revenue', total: 120 }]} nameKey="label" valueKey="total" center={<Text>120</Text>} />
            <RadialBarChart data={[{ label: 'Target', total: 40 }]} nameKey="label" valueKey="total" max={100} />
            <Sankey nodes={[{ name: 'Revenue' }, { name: 'Profit' }]} links={[{ source: 0, target: 1, value: 40 }]} aria-label="Revenue allocation" />
        </Box>
    </>
);

// @ts-expect-error Cartesian charts use xKey, not a categoryKey alias.
const _legacyChart = <AreaChart data={[]} categoryKey="month" series={[]} />;

const _externalSeriesLegend = <ChartLegend series={[{ key: 'total', label: 'Total' }]} />;
const _externalSegmentLegend = <ChartLegend data={[{ title: 'Complete', count: 12 }]} nameKey="title" />;
// @ts-expect-error Segment legends must select a field from their data.
const _legendKey = <ChartLegend data={[{ title: 'Complete' }]} nameKey="missing" />;
// @ts-expect-error Legend modes cannot be combined.
const _legendModes = <ChartLegend series={[{ key: 'total' }]} data={[{ title: 'Complete' }]} nameKey="title" />;
// @ts-expect-error Legends retain theme-owned presentation.
const _legendStyle = <ChartLegend series={[{ key: 'total' }]} style={{ color: 'red' }} />;
