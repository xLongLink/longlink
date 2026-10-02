import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Field } from '@astryxdesign/core/Field';
import { Stack } from '@astryxdesign/core/Stack';
import { Ellipsis, Info, X } from 'lucide-react';
import { Link as RouterLink } from 'react-router';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Slider } from '@astryxdesign/core/Slider';
import { Switch } from '@astryxdesign/core/Switch';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Calendar } from '@astryxdesign/core/Calendar';
import { Carousel } from '@astryxdesign/core/Carousel';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TreeList } from '@astryxdesign/core/TreeList';
import { componentDocumentation } from '@/platform/docs';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { DateInput } from '@astryxdesign/core/DateInput';
import { FileInput } from '@astryxdesign/core/FileInput';
import { List, ListItem } from '@astryxdesign/core/List';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TimeInput } from '@astryxdesign/core/TimeInput';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Step, Stepper } from '@astryxdesign/core/Stepper';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { documentationCategories } from '@/lib/documentation';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { OverflowList } from '@astryxdesign/core/OverflowList';
import { Table, proportional } from '@astryxdesign/core/Table';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { DateTimeInput } from '@astryxdesign/core/DateTimeInput';
import { MultiSelector } from '@astryxdesign/core/MultiSelector';
import { DateRangeInput } from '@astryxdesign/core/DateRangeInput';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { ComplexSelector } from '@astryxdesign/core/ComplexSelector';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';

/** Leaves inert, controlled previews unchanged. */
const noop = () => {};

// Preview artwork is presentation-only; JSX declarations determine catalog membership and categories.
const previews: Record<string, ReactNode> = {
    Button: (
        <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
            <Button label="Save" size="sm" variant="primary" />
            <Button label="Edit" size="sm" />
            <Button label="View" size="sm" variant="ghost" />
        </Stack>
    ),
    Link: <Link hasUnderline>Docs</Link>,
    ButtonGroup: (
        <ButtonGroup label="Text editing" size="sm">
            <Button label="Copy" />
            <Button label="Cut" />
            <Button label="Paste" />
        </ButtonGroup>
    ),
    DropdownMenu: (
        <DropdownMenu
            button={{ label: 'Edit', size: 'sm' }}
            items={[
                { label: 'Copy', onClick: noop },
                { label: 'Paste', onClick: noop },
            ]}
        />
    ),
    IconButton: <IconButton icon={<X aria-hidden="true" size={20} />} label="Close" size="sm" tooltip="Close" />,
    SegmentedControl: (
        <SegmentedControl label="Time range" value="week" onChange={noop} size="sm">
            <SegmentedControlItem label="Day" value="day" />
            <SegmentedControlItem label="Week" value="week" />
        </SegmentedControl>
    ),
    ToggleButton: <ToggleButton label="Bold" isPressed onPressedChange={noop} size="sm" />,
    ToggleButtonGroup: (
        <ToggleButtonGroup label="Formatting" type="multiple" value={['bold']} onChange={noop} size="sm">
            <ToggleButton label="Bold" value="bold" />
            <ToggleButton label="Italic" value="italic" />
        </ToggleButtonGroup>
    ),
    MoreMenu: (
        <MoreMenu
            icon={<Ellipsis aria-hidden="true" size={20} />}
            items={[
                { label: 'Edit', onClick: noop },
                { label: 'Delete', variant: 'destructive', onClick: noop },
            ]}
        />
    ),
    Avatar: <Avatar name="Ada Lovelace" size="lg" />,
    Heading: (
        <Heading className="mt-0" level={3}>
            Orders
        </Heading>
    ),
    Text: (
        <Text>
            Normal <b>bold</b> and <i>italic</i> text.
        </Text>
    ),
    CodeBlock: (
        <CodeBlock
            code={'export default function Welcome() {\n  return <Text>Hello world</Text>;\n}'}
            language="jsx"
            size="sm"
            width="100%"
            hasCopyButton={false}
            hasLanguageLabel={false}
            isWrapped
        />
    ),
    Icon: <Info aria-hidden="true" className="text-accent" size={20} />,
    Badge: <Badge label="Open" variant="info" />,
    StatusDot: (
        <Stack direction="horizontal" align="center" gap={2}>
            <StatusDot label="Online" variant="success" />
            <Text>Online</Text>
        </Stack>
    ),
    Timestamp: <Timestamp value="2026-09-30T12:00:00Z" format="date" color="primary" />,
    Currency: <Text>CHF 1’275.50</Text>,
    ProgressBar: <ProgressBar className="w-full" label="Progress" value={60} hasValueLabel />,
    Divider: <Divider label="Or" />,
    FileViewer: (
        <Stack gap={2} align="center" width="100%">
            <Stack aria-hidden="true" className="h-20 w-full rounded-lg bg-neutral" />
            <Stack aria-hidden="true" className="h-3 w-3/4 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-3 w-1/2 rounded-full bg-neutral" />
        </Stack>
    ),
    CheckboxInput: <CheckboxInput label="Approved" size="sm" value onChange={noop} />,
    Calendar: <Calendar className="scale-50" value="2026-10-02" focusDate="2026-10-02" onChange={noop} />,
    ComplexSelector: (
        <ComplexSelector label="Plan" value="team" triggerLabel="Team" onChange={noop} size="sm" width="100%">
            {(value, onChange) => (
                <RadioList label="Choose a plan" value={value} onChange={onChange}>
                    <RadioListItem label="Solo" value="solo" />
                    <RadioListItem label="Team" value="team" />
                </RadioList>
            )}
        </ComplexSelector>
    ),
    DateInput: <DateInput label="Due date" value="2026-10-02" onChange={noop} size="sm" width="100%" />,
    DateRangeInput: (
        <DateRangeInput
            label="Period"
            value={{ start: '2026-10-02', end: '2026-10-09' }}
            onChange={noop}
            size="sm"
            width="100%"
        />
    ),
    DateTimeInput: <DateTimeInput label="Appointment" onChange={noop} size="sm" width="100%" />,
    Field: (
        <Field label="Confidence" inputID="preview-confidence" description="Choose a confidence level." width="100%">
            <input id="preview-confidence" type="range" min={0} max={100} defaultValue={60} />
        </Field>
    ),
    MultiSelector: (
        <MultiSelector
            label="Teams"
            options={[
                { value: 'design', label: 'Design' },
                { value: 'engineering', label: 'Engineering' },
            ]}
            value={['design']}
            onChange={noop}
            size="sm"
            width="100%"
        />
    ),
    PowerSearch: (
        <PowerSearch
            config={{
                name: 'Orders',
                fields: [
                    {
                        key: 'status',
                        label: 'Status',
                        operators: [
                            {
                                key: 'is',
                                label: 'is',
                                value: {
                                    type: 'enum',
                                    values: [
                                        { value: 'open', label: 'Open' },
                                        { value: 'closed', label: 'Closed' },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            }}
            filters={[]}
            onChange={noop}
            label="Search orders"
            size="sm"
        />
    ),
    TimeInput: <TimeInput label="Start time" placeholder="Select a time" onChange={noop} size="sm" width="100%" />,
    FileInput: (
        <FileInput
            accept=".pdf"
            isLabelHidden
            label="Attachment"
            placeholder="File"
            value={null}
            width="100%"
            onChange={noop}
        />
    ),
    NumberInput: (
        <NumberInput
            isLabelHidden
            label="Quantity"
            min={1}
            size="sm"
            units="qty"
            value={3}
            width="100%"
            onChange={noop}
        />
    ),
    RadioList: (
        <RadioList label="Plan" orientation="horizontal" size="sm" value="team" onChange={noop} isLabelHidden>
            <RadioListItem label="Solo" value="solo" />
            <RadioListItem label="Team" value="team" />
        </RadioList>
    ),
    Selector: (
        <Selector
            label="Status"
            options={[
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
            ]}
            size="sm"
            value="open"
            width="100%"
            onChange={noop}
            isLabelHidden
        />
    ),
    Slider: <Slider label="Progress" value={60} valueDisplay="none" width="100%" onChange={noop} isLabelHidden />,
    Switch: <Switch label="Enabled" size="sm" value onChange={noop} />,
    TextArea: <TextArea isLabelHidden label="Notes" rows={2} size="sm" value="Review complete" onChange={noop} />,
    TextInput: <TextInput isLabelHidden label="Name" size="sm" value="New order" width="100%" onChange={noop} />,
    Card: <Card elevation="low">Lorem ipsum dolor sit amet.</Card>,
    Carousel: (
        <Carousel aria-label="Featured items" gap={2} hasSnap className="w-full">
            <Card className="w-32" padding={3}>
                <Text>Overview</Text>
            </Card>
            <Card className="w-32" padding={3}>
                <Text>Details</Text>
            </Card>
            <Card className="w-32" padding={3}>
                <Text>Activity</Text>
            </Card>
        </Carousel>
    ),
    ClickableCard: (
        <ClickableCard label="View order" onClick={noop} padding={3}>
            <Text>View order</Text>
        </ClickableCard>
    ),
    Collapsible: (
        <Collapsible trigger="Details" isOpen onOpenChange={noop}>
            <Text color="secondary">Additional information.</Text>
        </Collapsible>
    ),
    SelectableCard: (
        <SelectableCard label="Team plan" isSelected onChange={noop} padding={3}>
            <Text>Team plan</Text>
        </SelectableCard>
    ),
    Grid: (
        <Grid columns={2} gap={2}>
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
        </Grid>
    ),
    Menu: (
        <SideNav className="w-full">
            <SideNavSection title="Settings">
                <SideNavItem label="General" isSelected />
                <SideNavItem label="Workflow" />
            </SideNavSection>
        </SideNav>
    ),
    Stack: (
        <Stack align="center" gap={2}>
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
        </Stack>
    ),
    TabList: (
        <TabList onChange={noop} value="overview">
            <Tab label="Overview" value="overview" />
            <Tab label="Activity" value="activity" />
        </TabList>
    ),
    Stepper: (
        <Stepper activeStep={1} density="compact" orientation="vertical">
            <Step step={0} label="Details" />
            <Step step={1} label="Review" />
            <Step step={2} label="Complete" />
        </Stepper>
    ),
    Dialog: (
        <Dialog
            aria-label="Dialog preview"
            isInline
            isOpen
            maxHeight="100%"
            padding={2}
            width="100%"
            onOpenChange={noop}
        >
            <Stack gap={2}>
                <Stack direction="horizontal" align="center" justify="between" gap={2}>
                    <Heading className="mt-0" level={4}>
                        Edit order
                    </Heading>
                    <X aria-hidden="true" className="shrink-0 text-secondary" size={16} />
                </Stack>
                <Text>Content</Text>
                <Button label="Close" size="sm" variant="ghost" onClick={noop} />
            </Stack>
        </Dialog>
    ),
    List: (
        <List header="Tasks" density="compact" hasDividers>
            <ListItem label="Review order" description="Check the details" />
            <ListItem label="Send confirmation" />
        </List>
    ),
    MetadataList: (
        <MetadataList title="Order details" label={{ position: 'start' }}>
            <MetadataListItem label="Owner">Ada Lovelace</MetadataListItem>
            <MetadataListItem label="Status">Open</MetadataListItem>
        </MetadataList>
    ),
    OverflowList: (
        <OverflowList gap={2} maxVisibleItems={2} overflowRenderer={(items) => <Text>+{items.length} more</Text>}>
            <Text>Design</Text>
            <Text>Engineering</Text>
            <Text>Operations</Text>
        </OverflowList>
    ),
    TreeList: (
        <TreeList
            header="Files"
            density="compact"
            items={[
                {
                    id: 'views',
                    label: 'Views',
                    isExpanded: true,
                    children: [
                        { id: 'orders', label: 'orders.jsx' },
                        { id: 'users', label: 'users.jsx' },
                    ],
                },
            ]}
        />
    ),
    Table: (
        <Table
            data={[{ item: 'Order', status: 'Open' }]}
            density="compact"
            columns={[
                { key: 'item', header: 'Item', width: proportional(1) },
                { key: 'status', header: 'Status', width: proportional(1) },
            ]}
        />
    ),
};

const article = {
    description: 'Build interfaces with LongLink Views and components.',
    toc: [
        { id: 'views', label: 'Views', level: 1 },
        ...documentationCategories.map((category) => ({
            id: category.toLowerCase().replace(/\W+/g, '-'),
            label: category,
            level: 2,
        })),
    ],
    lastUpdated: '2026-10-02',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/sdk/longlink/.static/jsx/frontend.d.ts',
    title: 'Views | LongLink Documentation',
};

/** Renders the native JSX catalog generated from the shared editor declarations. */
export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="views" level={1}>
                    Views
                </Heading>
                <Text as="p">
                    Create each interface as a .jsx file exporting a default React component. LongLink supplies UI
                    components, hooks such as useState() and useEffect(), fragments, queries, and scoped requests
                    directly, without imports or a React. prefix. Your Python Solution needs no frontend build.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Why?</Text>
                    <Text as="p">
                        Keeping the interface separate from the application logic makes each part easier to understand
                        and maintain.
                    </Text>
                </Stack>
                <CodeBlock
                    code={`/** @param {ViewProps} props */
export default function Item({ params }) {
  const item = useApi(\`/api/items/\${params.item}\`);

  return <Heading>{item.name}</Heading>;
}`}
                    language="jsx"
                    title="items/[item].jsx"
                    hasLanguageLabel={false}
                />
                {documentationCategories.map((category) => (
                    <Stack key={category} gap={3}>
                        <Heading id={category.toLowerCase().replace(/\W+/g, '-')} level={2}>
                            {category}
                        </Heading>
                        <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                            {componentDocumentation
                                .filter((component) => component.category === category)
                                .map((component) => (
                                    <Stack key={component.slug} className="relative" gap={2}>
                                        <Card aria-hidden="true" inert padding={3} variant="muted">
                                            <Center className="h-40 scale-90" width="100%">
                                                {previews[component.name] ?? (
                                                    <Code>
                                                        {component.category === 'Runtime'
                                                            ? component.name
                                                            : `<${component.name} />`}
                                                    </Code>
                                                )}
                                            </Center>
                                        </Card>
                                        <Text type="supporting">
                                            {component.category === 'Action' ||
                                            component.category === 'Container' ||
                                            component.category === 'Feedback & Status' ||
                                            component.category === 'Form Controls' ||
                                            component.category === 'Table & List'
                                                ? component.name.replace(/([a-z])([A-Z])/g, '$1 $2')
                                                : component.name}
                                        </Text>
                                        <RouterLink
                                            aria-label={`Open ${component.name} documentation`}
                                            className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                            to={`/docs/sdk/views/${component.slug}/`}
                                        />
                                    </Stack>
                                ))}
                        </Grid>
                    </Stack>
                ))}
            </Stack>
        </Article>
    );
}
