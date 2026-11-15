const anchor = useComboboxAnchor();

const [selected, setSelected] = useState('one');
const remembered = useRef(/** @type {HTMLButtonElement | null} */ (null));
const textRef = useRef(/** @type {HTMLElement | null} */ (null));
const formRef = useRef(/** @type {HTMLFormElement | null} */ (null));
const linkRef = useRef(/** @type {HTMLAnchorElement | null} */ (null));
useEffect(() => {}, []);
const label = useMemo(() => selected.toUpperCase(), [selected]);
const confirmation = useConfirm();
confirmation.show({ title: 'Publish changes?', actionLabel: 'Publish', actionVariant: 'default', onAction: async () => {} });

const records = [{ id: 'shipment', name: 'Shipment', price: 2 }];
const table = useTable({
    features: dataGridFeatures,
    data: records,
    columns: [{ accessorKey: 'name', header: ({ column }) => <DataGridColumnHeader column={column} title="Name" /> }],
    getRowId: (row) => row.id
});
const query = createFilterQuery();
const downloads = useDownload();
const icon = <Icon icon="triangle-exclamation-point" size="sm" />;
const token = <Token icon="user-round" label="Owner" />;
const fileType = <FileType type="pdf" variant="solid" size="sm" icon={icon} label={null} aria-label="Invoice PDF" />;
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
    <DataTable
        data={records}
        columns={[{ key: 'price', sortable: true }]}
        idKey="id"
        enableRowSelection
        onSortingChange={(sorting) => sorting[0]?.desc.valueOf()}
        onRowSelectionChange={(selection) => selection.shipment?.valueOf()}
        emptyMessage={<Button onClick={async () => { await downloads.download('/api/export', 'shipments.csv'); }}>Export</Button>}
    />
);
const filters = <Filters fields={[]} query={query} onQueryChange={(next) => flattenFilterConditions(next)} />;

const nativeComposition = (
    <Card id="settings" onPointerDown={(event) => event.currentTarget.focus()}>
        <CardHeader>
            <CardTitle>{label}</CardTitle>
            <CardDescription>Settings</CardDescription>
        </CardHeader>
        <CardContent>
            <Collapsible onOpenChange={(open, details) => {
                open.valueOf();
                details.cancel();
            }}>
                <CollapsibleTrigger render={<Button />}>Details</CollapsibleTrigger>
                <CollapsibleContent keepMounted>Order details</CollapsibleContent>
            </Collapsible>
            <Calendar mode="range" onSelect={(range) => range?.from?.getDate()} />
            <Calendar mode="multiple" onSelect={(dates) => dates?.map((date) => date.getDate())} />
            <Text
                as="h4"
                id="publication-status"
                role="status"
                aria-live="polite"
                data-publication="current"
                ref={textRef}
                className="text-muted-foreground"
                style={{ textWrap: 'balance' }}
                onClick={(event) => event.currentTarget.focus()}
            >
                Ready to publish
            </Text>
            <Avatar size="sm" aria-label="Account">
                <AvatarImage src="/account.png" alt="Account" />
                <AvatarFallback>AC</AvatarFallback>
                <AvatarBadge />
            </Avatar>
            <GeneratedAvatar name="Account" src="/account.png" />
            <Stack
                aria-label="Preview"
                className="gap-4"
                style={{ gap: 16 }}
                onFocus={(event) => event.currentTarget.focus()}
            >
                <Grid id="preview" style={{ gridTemplateColumns: '1fr' }} />
            </Stack>
            <Separator orientation="vertical" id="account-divider" aria-label="Account sections" />
            <Divider label={<a href="/login">Sign in</a>} />
            <Link
                ref={linkRef}
                href="/orders"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                aria-label="Orders"
                onClick={(event) => event.currentTarget.href.trim()}
            >
                <span>Orders</span>
            </Link>
            <AttachmentLink href="/api/report" download="report.pdf">
                Download report
            </AttachmentLink>
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
            <SwitchField label="Notifications" defaultChecked />
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
            <Disclosure trigger="Persistent details" defaultOpen={false} disabled={false} />
            <DropdownMenu
                open={selected === 'menu'}
                onOpenChange={(open, details) => {
                    details.cancel();
                    setSelected(open ? 'menu' : 'one');
                }}
            >
                <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuCheckboxItem
                        checked
                        onCheckedChange={(checked, details) => {
                            checked.valueOf();
                            details.cancel();
                        }}
                    >
                        Notifications
                    </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <ActionButton href="/orders" onClick={async (event) => event.preventDefault()}>
                Save order
            </ActionButton>
            <Table aria-label="Orders">
                <TableCaption>Open orders</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead scope="col">Reference</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow onClick={(event) => event.currentTarget.focus()}>
                        <TableCell colSpan={2}>PO-871</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            <DataTable data={[{ reference: 'PO-871' }]} />
            <Empty aria-label="Search results">
                <EmptyHeader>
                    <EmptyTitle>No matching orders</EmptyTitle>
                    <EmptyDescription>Change the search filters.</EmptyDescription>
                </EmptyHeader>
            </Empty>
            <Stepper defaultValue={1} onValueChange={(step) => step.toFixed()}>
                <StepperNav>
                    <StepperItem step={1}>
                        <StepperTrigger>
                            <StepperIndicator>1</StepperIndicator>
                        </StepperTrigger>
                        <StepperSeparator />
                    </StepperItem>
                </StepperNav>
                <StepperPanel>
                    <StepperContent value={1} forceMount>
                        Draft
                    </StepperContent>
                </StepperPanel>
            </Stepper>
            <Wizard>
                <Step label="Details">Draft</Step>
            </Wizard>
            <Badge onAnimationStart={(event) => event.currentTarget.focus()} style={{ textWrap: 'balance' }}>
                Ready
            </Badge>
            <Token label="Priority" size="xs" />
            <Token label="Priority" size="sm" />
            <Token label="Priority" size="default" />
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
            <ActionButtonGroup label="Actions" size="default">
                <ActionButton
                    aria-label="Approve"
                    size="icon-xs"
                    variant="outline"
                    onClick={async (event) => {
                        event.currentTarget.focus();
                    }}
                >
                    <Icon icon="check" size="sm" />
                </ActionButton>
            </ActionButtonGroup>
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
            <SliderField label="Level" defaultValue={10} onValueChange={(value) => value.toFixed()} />
            <Progress value={50}>
                <ProgressLabel>Progress</ProgressLabel>
                <ProgressValue />
            </Progress>
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
    <InteractiveCard size="sm" className="w-full" style={{ minHeight: 100 }} isSelected onChange={() => {}}>
        <CardContent>
            <FramedDialog open onOpenChange={() => {}} title="Title" variant="fullscreen" gap={4} paddingInline={4}>
                {nativeComposition}
            </FramedDialog>
        </CardContent>
    </InteractiveCard>
);

// @ts-expect-error Native variants must not silently accept arbitrary strings.
const _badVariant = <Badge variant="not-a-variant" />;
// @ts-expect-error Native Button no longer accepts the legacy label adapter.
const _legacyButton = <Button label="Save" />;
// @ts-expect-error Unlabeled lines use native Separator, not custom Divider.
const _unlabeledDivider = <Divider />;
// @ts-expect-error Native Separator has no LongLink full-bleed policy.
const _legacySeparator = <Separator isFullBleed />;
// @ts-expect-error Slider inference must preserve numeric scalar values.
const _badSlider = <Slider defaultValue={10} onValueChange={(value) => value.map(Math.round)} />;
// @ts-expect-error FramedDialog visibility changes require a controlled callback.
const _uncontrolledFrame = <FramedDialog open title="Title" />;

// @ts-expect-error ActionButtonGroup no longer accepts the legacy medium size.
const _legacyGroupSize = <ActionButtonGroup label="Actions" size="md" />;

// @ts-expect-error ActionButton uses native Button variants.
const _legacyIconVariant = <ActionButton aria-label="Approve" variant="primary"><Icon icon="check" size="sm" /></ActionButton>;

// @ts-expect-error Native Table accepts HTML composition, not the data adapter contract.
const _legacyTable = <Table data={[{ name: 'Order' }]} />;
// @ts-expect-error Native DropdownMenu does not accept data-driven action items.
const _legacyMenu = <DropdownMenu items={[]} />;

// @ts-expect-error Native ButtonGroup does not coordinate the custom disabled group contract.
const _customGroupProps = <ButtonGroup isDisabled />;
// @ts-expect-error Native Dialog does not accept the framed visibility contract.
const _customDialogProps = <Dialog isOpen open onOpenChange={() => {}} />;
// @ts-expect-error Ordinary links use the native href property.
const _legacyLink = <Link to="/orders">Orders</Link>;
// @ts-expect-error Scoped previews belong to AttachmentLink.
const _customLinkProps = <Link href="/api/report" preview="report.pdf">Preview</Link>;
// @ts-expect-error Native Pagination is composed from anchors, not the custom data pagination contract.
const _customPaginationProps = <Pagination page={1} totalItems={50} pageSize={10} onPageChange={() => {}} />;

const _nativeCharts = (
    <>
        <ChartContainer
            config={{ total: { label: 'Total', color: 'var(--chart-1)' } }}
            style={{ height: 280 }}
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
        <ChartContainer config={{}} style={{ height: 280 }} aria-label="Revenue allocation">
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
