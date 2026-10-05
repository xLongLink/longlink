import { Ellipsis, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import * as views from '@/views/components';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { Stack } from '@astryxdesign/core/Stack';
import { useState, type ReactNode } from 'react';
import { Divider } from '@/components/ui/Divider';
import { Calendar } from '@/components/ui/Calendar';
import { MoreMenu } from '@/components/ui/MoreMenu';
import { Selector } from '@/components/ui/Selector';
import { TextArea } from '@/components/ui/TextArea';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { DateInput } from '@/components/ui/DateInput';
import { FileInput } from '@/components/ui/FileInput';
import { StatusDot } from '@/components/ui/StatusDot';
import { TextInput } from '@/components/ui/TextInput';
import { TimeInput } from '@/components/ui/TimeInput';
import { Timestamp } from '@/components/ui/Timestamp';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Step, Stepper } from '@/components/ui/Stepper';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { Collapsible } from '@/components/ui/Collapsible';
import { NumberInput } from '@/components/ui/NumberInput';
import { PowerSearch } from '@/components/ui/PowerSearch';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { CheckboxInput } from '@/components/ui/CheckboxInput';
import { DateTimeInput } from '@/components/ui/DateTimeInput';
import { MultiSelector } from '@/components/ui/MultiSelector';
import { DateRangeInput } from '@/components/ui/DateRangeInput';
import { ComplexSelector } from '@/components/ui/ComplexSelector';
import { Menu, MenuSection, MenuItem } from '@/components/ui/Menu';
import { RadioList, RadioListItem } from '@/components/ui/RadioList';
import { MetadataList, MetadataListItem } from '@/components/ui/MetadataList';

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
    Link: <views.Link to="#">Docs</views.Link>,
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
    Heading: <views.Heading level={3}>Orders</views.Heading>,
    Text: (
        <views.Text>
            Normal <b>bold</b> and <i>italic</i> text.
        </views.Text>
    ),
    CodeBlock: (
        <CodeBlock code={'function Example() {\n  return <Text>Hello world</Text>;\n}'} language="jsx" isWrapped />
    ),
    Icon: <views.Icon icon="info" size="md" />,
    EmptyState: <EmptyState title="No results found" />,
    Badge: <Badge label="Open" variant="info" />,
    StatusDot: (
        <Stack direction="horizontal" align="center" gap={2}>
            <StatusDot label="Online" variant="success" />
            <Text>Online</Text>
        </Stack>
    ),
    Timestamp: <Timestamp value="2026-09-30T12:00:00Z" format="date" />,
    Currency: <views.Currency value={1275.5} currency="CHF" />,
    ProgressBar: <ProgressBar label="Progress" value={60} hasValueLabel />,
    Divider: <Divider />,
    FileViewer: <views.FileViewer src="/api/items/123/image" title="View image" />,
    CheckboxInput: <CheckboxInput label="Approved" size="sm" value onChange={noop} />,
    Calendar: <Calendar className="scale-50" value="2026-10-02" onChange={noop} />,
    ComplexSelector: (
        <ComplexSelector label="Plan" value="team" triggerLabel="Team" onChange={noop} width="100%">
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
    Slider: <Slider label="Progress" value={60} width="100%" onChange={noop} isLabelHidden />,
    Switch: <Switch label="Enabled" size="sm" value onChange={noop} />,
    TextArea: <TextArea isLabelHidden label="Notes" rows={2} value="Review complete" onChange={noop} />,
    TextInput: <TextInput isLabelHidden label="Name" size="sm" value="New order" width="100%" onChange={noop} />,
    Card: <Card>Lorem ipsum dolor sit amet.</Card>,
    Collapsible: (
        <Collapsible trigger="Details" isOpen onOpenChange={noop}>
            <Text color="secondary">Additional information.</Text>
        </Collapsible>
    ),
    Grid: (
        <views.Grid columns={2} gap={2}>
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
        </views.Grid>
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
        <views.Stack align="center" gap={2}>
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
            <Stack aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
        </views.Stack>
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
    Dialog: <DialogPreview />,
    MetadataList: (
        <MetadataList title="Order details">
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

/** Opens a real modal only when the user requests the Dialog example. */
function DialogPreview() {
    const [isOpen, setIsOpen] = useState(false);

    // Keep catalog previews closed and let the actual wrapper own modal behavior.
    return (
        <>
            <Button label="Open dialog" onClick={() => setIsOpen(true)} />
            <Dialog aria-label="Edit order" isOpen={isOpen} onOpenChange={setIsOpen}>
                <Text>Order details</Text>
                <Button label="Close" onClick={() => setIsOpen(false)} />
            </Dialog>
        </>
    );
}

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
