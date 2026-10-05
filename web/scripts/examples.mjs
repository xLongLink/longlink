// Showcase only the public LongLink contracts, not upstream-only components or styling props.
export const examples = {
    Avatar: { content: '<Avatar name="Ada Lovelace" />' },
    Badge: { content: '<Badge label="Open" variant="info" />' },
    Button: {
        content:
            '<Button label="Save" onClick={async () => { await request("/api/settings", { method: "PATCH", json: { enabled: true } }); }} />',
    },
    ButtonGroup: {
        content:
            '<ButtonGroup label="Actions"><Button label="Save" /><Button label="Cancel" variant="ghost" /></ButtonGroup>',
    },
    Calendar: {
        state: 'const [value, setValue] = useState("2026-10-02");',
        content: '<Calendar value={value} onChange={setValue} />',
    },
    CheckboxInput: {
        state: 'const [value, setValue] = useState(false);',
        content: '<CheckboxInput label="Approved" value={value} onChange={setValue} />',
    },
    CodeBlock: {
        content:
            '<CodeBlock code={\'function Example() { return <Text>Hello</Text>; }\'} language="jsx" title="example.jsx" />',
    },
    Collapsible: { content: '<Collapsible trigger="Details"><Text>Additional information</Text></Collapsible>' },
    ComplexSelector: {
        state: 'const [value, setValue] = useState("team");',
        content:
            '<ComplexSelector label="Plan" value={value} onChange={setValue} triggerLabel={value}>{(value, onChange, close) => <RadioList label="Choose a plan" value={value} onChange={(next) => { onChange(next); close(); }}><RadioListItem label="Solo" value="solo" /><RadioListItem label="Team" value="team" /></RadioList>}</ComplexSelector>',
    },
    DateInput: {
        state: 'const [value, setValue] = useState("2026-10-02");',
        content: '<DateInput label="Due date" value={value} onChange={setValue} />',
    },
    DateRangeInput: {
        state: 'const [value, setValue] = useState({ start: "2026-10-02", end: "2026-10-09" });',
        content: '<DateRangeInput label="Period" value={value} onChange={setValue} />',
    },
    DateTimeInput: {
        state: 'const [value, setValue] = useState();',
        content: '<DateTimeInput label="Appointment" value={value} onChange={setValue} />',
    },
    Dialog: {
        state: 'const [isOpen, setIsOpen] = useState(false);',
        content:
            '<Stack gap={3}><Button label="Open dialog" onClick={() => setIsOpen(true)} /><Dialog aria-label="Order details" isOpen={isOpen} onOpenChange={setIsOpen}><Text>Order details</Text><Button label="Close" onClick={() => setIsOpen(false)} /></Dialog></Stack>',
    },
    Divider: { content: '<Stack gap={3}><Text>Before</Text><Divider /><Text>After</Text></Stack>' },
    DropdownMenu: {
        content:
            '<DropdownMenu button={{ label: "Actions" }} items={[{ id: "edit", label: "Edit", onClick: () => navigate("/edit") }]} />',
    },
    EmptyState: { content: '<EmptyState title="No results found" />' },
    FileInput: {
        state: 'const [value, setValue] = useState(null);',
        content:
            '<FileInput label="Attachment" value={value} onChange={setValue} accept=".pdf" maxSize={5 * 1024 * 1024} />',
    },
    Grid: {
        content:
            '<Grid columns={2} gap={3}><Text>First column</Text><GridSpan columns="full"><Text>Full-width content</Text></GridSpan></Grid>',
    },
    Heading: { content: '<Heading level={2}>Order details</Heading>' },
    Icon: { content: '<Icon icon="search" size="md" />' },
    IconButton: {
        content:
            '<IconButton label="Refresh" icon={<Icon icon="refresh" size="sm" />} onClick={async () => { await request("/api/refresh", { method: "POST" }); }} />',
    },
    Link: { content: '<Link to="/orders">Orders</Link>' },
    MetadataList: {
        content:
            '<MetadataList title="Order details"><MetadataListItem label="Owner">Ada Lovelace</MetadataListItem><MetadataListItem label="Status">Open</MetadataListItem></MetadataList>',
    },
    MoreMenu: { content: '<MoreMenu items={[{ id: "edit", label: "Edit", onClick: () => navigate("/edit") }]} />' },
    MultiSelector: {
        state: 'const [value, setValue] = useState(["design"]);',
        content:
            '<MultiSelector label="Teams" options={["design", "engineering"]} value={value} onChange={setValue} hasSearch />',
    },
    NumberInput: {
        state: 'const [value, setValue] = useState(1);',
        content: '<NumberInput label="Quantity" value={value} onChange={setValue} min={1} step={1} />',
    },
    PowerSearch: {
        state: 'const [filters, setFilters] = useState([]);\nconst config = { name: "Orders", fields: [{ key: "status", label: "Status", operators: [{ key: "is", label: "is", value: { type: "enum", values: [{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }] } }] }] };',
        content: '<PowerSearch config={config} filters={filters} onChange={setFilters} label="Search orders" />',
    },
    ProgressBar: { content: '<ProgressBar label="Progress" value={60} max={100} hasValueLabel />' },
    RadioList: {
        state: 'const [value, setValue] = useState("team");',
        content:
            '<RadioList label="Plan" value={value} onChange={setValue}><RadioListItem label="Solo" value="solo" /><RadioListItem label="Team" value="team" /></RadioList>',
    },
    Selector: {
        state: 'const [value, setValue] = useState("open");',
        content: '<Selector label="Status" options={["open", "closed"]} value={value} onChange={setValue} />',
    },
    Slider: {
        state: 'const [value, setValue] = useState(60);',
        content: '<Slider label="Progress" value={value} onChange={setValue} min={0} max={100} />',
    },
    Stack: {
        content:
            '<Stack direction="horizontal" gap={3}><Text>Label</Text><StackItem size="fill"><Text>Flexible content</Text></StackItem></Stack>',
    },
    StatusDot: { content: '<StatusDot label="Online" variant="success" />' },
    Stepper: {
        content:
            '<Stepper activeStep={1}><Step step={0} label="Details" /><Step step={1} label="Review" /><Step step={2} label="Complete" /></Stepper>',
    },
    Switch: {
        state: 'const [value, setValue] = useState(true);',
        content: '<Switch label="Enabled" value={value} onChange={setValue} />',
    },
    Table: {
        content:
            '<Table data={[{ id: "1", name: "Order", status: "Open" }]} idKey="id" columns={[{ key: "name", header: "Name", width: proportional(2) }, { key: "status", header: "Status", width: proportional(1) }]} />',
    },
    Text: { content: '<Text>Order details</Text>' },
    TextArea: {
        state: 'const [value, setValue] = useState("");',
        content: '<TextArea label="Notes" value={value} onChange={setValue} rows={4} />',
    },
    TextInput: {
        state: 'const [value, setValue] = useState("");',
        content: '<TextInput label="Name" value={value} onChange={setValue} isRequired />',
    },
    TimeInput: {
        state: 'const [value, setValue] = useState();',
        content: '<TimeInput label="Start time" value={value} onChange={setValue} />',
    },
    Timestamp: { content: '<Timestamp value="2026-10-02T12:00:00Z" format="date_time" />' },
};
