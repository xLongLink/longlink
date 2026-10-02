import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Table } from '@astryxdesign/core/Table';
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
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { TextArea } from '@astryxdesign/core/TextArea';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { FileInput } from '@astryxdesign/core/FileInput';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Step, Stepper } from '@astryxdesign/core/Stepper';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { componentDocumentation, documentationCategories } from '@/lib/generated/documentation';

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
    StatusBadge: (
        <Stack direction="horizontal" align="center" gap={2} wrap="wrap">
            <Badge label="Creating" variant="info" />
            <Badge label="Failed" variant="error" />
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

const article = {
    description: 'Build interfaces with LongLink Views and components.',
    toc: [
        { id: 'views', label: 'Views', level: 1 },
        ...documentationCategories.map(({ name }) => ({ id: name.toLowerCase(), label: name, level: 2 })),
    ],
    lastUpdated: '2026-10-01',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/sdk/longlink/.static/new/src/views/frontend.d.ts',
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
                    Create each interface as a .jsx file exporting a default React component. LongLink supplies React,
                    UI components, state hooks, queries, and scoped requests. Your Python Solution needs no frontend
                    build.
                </Text>
                <Text as="p">
                    Solution code runs in a sandboxed iframe with an opaque origin, not inside the Platform page. Use
                    request() and navigate() for your own Solution. Direct network access and Platform credentials are
                    unavailable. Optional adjacent .json files supply name and icon metadata.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Why?</Text>
                    <Text as="p">
                        Keeping the interface separate from the application logic makes each part easier to understand
                        and maintain.
                    </Text>
                </Stack>
                <CodeBlock
                    code={
                        'export default function Welcome() {\n  return <Stack gap={3}><Heading level={1}>Welcome</Heading><Text>Hello world</Text></Stack>;\n}'
                    }
                    language="jsx"
                    title="welcome.jsx"
                    hasLanguageLabel={false}
                />
                {documentationCategories.map((category) => (
                    <Stack key={category.name} gap={3}>
                        <Heading id={category.name.toLowerCase()} level={2}>
                            {category.name}
                        </Heading>
                        <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                            {componentDocumentation
                                .filter((component) => component.category === category.name)
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
                                        <Text type="supporting">{component.name}</Text>
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
