const anchor = useComboboxAnchor();

const [selected, setSelected] = useState('one');
const remembered = useRef(/** @type {HTMLButtonElement | null} */ (null));
useEffect(() => {}, []);
const label = useMemo(() => selected.toUpperCase(), [selected]);

const nativeComposition = (
    <Card id="settings" onPointerDown={(event) => event.currentTarget.focus()}>
        <CardHeader>
            <CardTitle>{label}</CardTitle>
            <CardDescription>Settings</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Checkbox
                indeterminate
                onCheckedChange={(checked, details) => {
                    checked.valueOf();
                    details.cancel();
                }}
            />
            <Collapsible
                defaultOpen
                onOpenChange={(open, details) => {
                    open.valueOf();
                    details.cancel();
                }}
            >
                <CollapsibleTrigger>Details</CollapsibleTrigger>
                <CollapsibleContent keepMounted>Draft</CollapsibleContent>
            </Collapsible>
            <Disclosure trigger="Persistent details" />
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
            <ButtonGroup label="Actions" size="default">
                <IconButton
                    icon="check"
                    label="Approve"
                    size="xs"
                    variant="outline"
                    onClick={async (event) => {
                        event.currentTarget.focus();
                    }}
                />
            </ButtonGroup>
            <FileViewer src="/attachment" title="Attachment" size="md" />
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
    <InteractiveCard padding={4} isSelected onChange={() => {}}>
        <Dialog isOpen onOpenChange={() => {}} title="Title" variant="fullscreen" gap={4} paddingInline={4}>
            {nativeComposition}
        </Dialog>
    </InteractiveCard>
);

// @ts-expect-error Native variants must not silently accept arbitrary strings.
const _badVariant = <Badge variant="not-a-variant" />;
// @ts-expect-error Native Button no longer accepts the legacy label adapter.
const _legacyButton = <Button label="Save" />;
// @ts-expect-error Slider inference must preserve numeric scalar values.
const _badSlider = <Slider defaultValue={10} onValueChange={(value) => value.map(Math.round)} />;
// @ts-expect-error Dialog visibility changes require a controlled callback.
const _legacyDialog = <Dialog isOpen title="Title" />;

// @ts-expect-error ButtonGroup no longer accepts the legacy medium size.
const _legacyGroupSize = <ButtonGroup label="Actions" size="md" />;

// @ts-expect-error IconButton uses native Button variants.
const _legacyIconVariant = <IconButton icon="check" label="Approve" variant="primary" />;
