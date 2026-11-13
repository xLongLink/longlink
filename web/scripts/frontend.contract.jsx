const anchor = useComboboxAnchor();

const [selected, setSelected] = useState('one');
const remembered = useRef(/** @type {HTMLButtonElement | null} */ (null));
const textRef = useRef(/** @type {HTMLElement | null} */ (null));
useEffect(() => {}, []);
const label = useMemo(() => selected.toUpperCase(), [selected]);
const confirmation = useConfirm();
confirmation.show({ title: 'Publish changes?', actionLabel: 'Publish', actionVariant: 'default', onAction: async () => {} });

const nativeComposition = (
    <Card id="settings" onPointerDown={(event) => event.currentTarget.focus()}>
        <CardHeader>
            <CardTitle>{label}</CardTitle>
            <CardDescription>Settings</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Avatar name="Account" src="/account.png" />
            <Separator orientation="vertical" id="account-divider" aria-label="Account sections" />
            <Divider label={<a href="/login">Sign in</a>} />
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

const _adapters = (
    <InteractiveCard size="sm" className="w-full" style={{ minHeight: 100 }} isSelected onChange={() => {}}>
        <CardContent>
            <ViewDialog isOpen onOpenChange={() => {}} title="Title" variant="fullscreen" gap={4} paddingInline={4}>
                {nativeComposition}
            </ViewDialog>
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
// @ts-expect-error ViewDialog visibility changes require a controlled callback.
const _legacyDialog = <ViewDialog isOpen title="Title" />;

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
// @ts-expect-error Native Dialog uses open/defaultOpen, not the host-coordinated ViewDialog contract.
const _customDialogProps = <Dialog isOpen />;
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
