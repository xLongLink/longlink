import { Card } from '@/components/ui/Card';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Table } from '@astryxdesign/core/Table';
import { Ellipsis, Info, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Slider } from '@astryxdesign/core/Slider';
import { Switch } from '@astryxdesign/core/Switch';
import { Calendar } from '@/components/ui/Calendar';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { TextArea } from '@astryxdesign/core/TextArea';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { DateInput } from '@astryxdesign/core/DateInput';
import { FileInput } from '@astryxdesign/core/FileInput';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TimeInput } from '@astryxdesign/core/TimeInput';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Step, Stepper } from '@astryxdesign/core/Stepper';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { PowerSearch } from '@astryxdesign/core/PowerSearch';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { DateTimeInput } from '@astryxdesign/core/DateTimeInput';
import { MultiSelector } from '@astryxdesign/core/MultiSelector';
import { Menu, MenuSection, MenuItem } from '@/components/ui/Menu';
import { DateRangeInput } from '@astryxdesign/core/DateRangeInput';
import { ComplexSelector } from '@astryxdesign/core/ComplexSelector';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';

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
    EmptyState: <EmptyState title="No results found" description="Try adjusting your search or filters." />,
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
    Calendar: <Calendar className="scale-50" value="2026-10-02" onChange={noop} />,
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
    Card: <Card>Lorem ipsum dolor sit amet.</Card>,
    Collapsible: (
        <Collapsible trigger="Details" isOpen onOpenChange={noop}>
            <Text color="secondary">Additional information.</Text>
        </Collapsible>
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
        <Menu>
            <MenuSection title="Settings">
                <MenuItem label="Profile">
                    <Text>Profile settings</Text>
                </MenuItem>
                <MenuItem label="Workflow">
                    <Text>Workflow settings</Text>
                </MenuItem>
            </MenuSection>
        </Menu>
    ),
    Stack: (
        <Stack align="center" gap={2}>
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
        </Stack>
    ),
    Tabs: (
        <Tabs>
            <Tab label="Overview" value="overview">
                <Text>Overview content</Text>
            </Tab>
            <Tab label="Activity" value="activity">
                <Text>Activity content</Text>
            </Tab>
        </Tabs>
    ),
    Stepper: (
        <Stepper activeStep={1}>
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
    MetadataList: (
        <MetadataList title="Order details" label={{ position: 'start' }}>
            <MetadataListItem label="Owner">Ada Lovelace</MetadataListItem>
            <MetadataListItem label="Status">Open</MetadataListItem>
        </MetadataList>
    ),
    Table: (
        <Table
            data={[{ item: 'Order', status: 'Open' }]}
            density="compact"
            columns={[
                { key: 'item', header: 'Item' },
                { key: 'status', header: 'Status' },
            ]}
        />
    ),
};

/** Renders trusted native previews without evaluating documentation source in the Platform. */
export function ComponentPreview({ name, example }: { name: string; example?: string }) {
    const [selected, setSelected] = useState(false);
    const [count, setCount] = useState(0);

    // Show the behavior specific to each authored example.
    if (name === 'React') {
        return (
            <Stack gap={3}>
                <Text>Count: {count}</Text>
                <Button label="Increment" onClick={() => setCount((previous) => previous + 1)} />
            </Stack>
        );
    }
    if (name === 'Card' && example) {
        return example === 'Selectable card' ? (
            <Card label="Team plan" isSelected={selected} onChange={setSelected}>
                <Text>Team plan</Text>
            </Card>
        ) : example === 'Clickable card' ? (
            <Card label="View order" href="/orders/123">
                <Text>View order</Text>
            </Card>
        ) : (
            <Card padding={3}>
                <Text>Order details</Text>
            </Card>
        );
    }
    if (name === 'Currency' && example) {
        return <Text>{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(1234.5)}</Text>;
    }
    if (name === 'FileViewer' && example) {
        return <Button variant="ghost" label="View image" />;
    }

    // Reuse catalog artwork for the same component in its documentation article.
    return previews[name] ?? <Code>{`<${name} />`}</Code>;
}
