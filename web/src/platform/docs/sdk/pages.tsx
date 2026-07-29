import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Code } from '@astryxdesign/core/Code';
import { Divider } from '@astryxdesign/core/Divider';
import { FileInput } from '@astryxdesign/core/FileInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Selector } from '@astryxdesign/core/Selector';
import { Slider } from '@astryxdesign/core/Slider';
import { Stack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { Table as AstryxTable } from '@astryxdesign/core/Table';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Info } from 'lucide-react';
import { Link as RouterLink } from 'react-router';
import { pageElementHrefByName } from '@/platform/docs/sdk/elements';
import { pageReferenceDocs } from '@/platform/docs/sdk/references';

type ComponentSummary = {
    name: string;
    description: string;
};

type ComponentCategoryConfiguration = {
    id: string;
    title: string;
    description: string;
};

type ComponentCategory = ComponentCategoryConfiguration & {
    components: ComponentSummary[];
};

const componentCategoryConfigurations: ComponentCategoryConfiguration[] = [
    {
        id: 'longlink-runtime-concepts',
        title: 'LongLink Runtime Concepts',
        description:
            'Cross-cutting page runtime rules for conditional rendering, translations, expressions, bindings, and file discovery.',
    },
    {
        id: 'longlink-state-elements',
        title: 'LongLink State Elements',
        description:
            'LongLink-specific XML elements prepare page state, data, actions, and repeated scopes before Astryx components render.',
    },
    {
        id: 'action',
        title: 'Action',
        description: 'Command and navigation elements for starting work or moving users to another destination.',
    },
    {
        id: 'container',
        title: 'Container',
        description: 'Bounded surfaces for content that should read as one independent item.',
    },
    {
        id: 'content',
        title: 'Content',
        description: 'Text, identity, and visual primitives for readable page content.',
    },
    {
        id: 'data-input',
        title: 'Data Input',
        description: 'Controls that collect page data through literal values, expressions, or writable state bindings.',
    },
    {
        id: 'feedback-and-status',
        title: 'Feedback & Status',
        description: 'Status elements that communicate state, severity, or persistent page feedback.',
    },
    {
        id: 'layout',
        title: 'Layout',
        description: 'Composition primitives for arranging content without handwritten layout markup.',
    },
    {
        id: 'navigation',
        title: 'Navigation',
        description: 'Navigation structures for tabs, side navigation, and application page movement.',
    },
    {
        id: 'overlay',
        title: 'Overlay',
        description: 'Layered surfaces for focused workflows that should appear above the page.',
    },
    {
        id: 'table-and-list',
        title: 'Table & List',
        description: 'Structured display elements for row-oriented business data.',
    },
];

const componentCategories: ComponentCategory[] = componentCategoryConfigurations.map((category) => ({
    ...category,
    components: pageReferenceDocs
        .filter((component) => component.category === category.title)
        .map(({ name, summary: description }) => ({ name, description })),
}));

const previewRows: Array<Record<string, string>> = [{ item: 'Order', status: 'Open' }];
const previewColumns = [
    { key: 'item', header: 'Item' },
    { key: 'status', header: 'Status' },
];

export const metadata = {
    toc: componentCategories.map((category) => ({ id: category.id, label: category.title })),
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages.tsx',
};

/** Renders one categorized group of XML page components. */
function ComponentCategorySection({ category }: { category: ComponentCategory }) {
    return (
        <Stack gap={3}>
            <Stack gap={2}>
                <Heading id={category.id} level={2}>
                    {category.title}
                </Heading>
                <Text as="p" color="secondary">
                    {category.description}
                </Text>
            </Stack>
            <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                {category.components.map((component) => (
                    <ComponentSummaryCard key={component.name} component={component} />
                ))}
            </Grid>
        </Stack>
    );
}

/** Renders one component summary card in the XML page gallery. */
function ComponentSummaryCard({ component }: { component: ComponentSummary }) {
    const href = pageElementHrefByName[component.name];

    return (
        <Stack className="group relative" gap={2}>
            <Card aria-hidden="true" inert minHeight={190} variant="muted">
                <Center minHeight={150}>{renderComponentPreview(component.name)}</Center>
            </Card>
            <Text color="secondary" type="supporting">
                {component.name}
            </Text>
            <RouterLink
                aria-label={`Open ${component.name} documentation`}
                className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                to={href}
            />
        </Stack>
    );
}

/** Renders a compact live or symbolic preview for one XML page element. */
function renderComponentPreview(name: string) {
    switch (name) {
        case 'if':
            return <Code>{'if="${order.open}"'}</Code>;
        case 'i18n':
            return <Code>{'i18n="orders.title"'}</Code>;
        case 'values':
            return <Code>{'values="${{ name: user.name }}"'}</Code>;
        case 'count':
            return <Code>{'count="${orders.length}"'}</Code>;
        case 'Expressions':
            return <Code>{'${order.total > 0}'}</Code>;
        case 'Bindings':
            return <Code>{'value="$form.name"'}</Code>;
        case 'Translations':
            return <Code>{'orders.title'}</Code>;
        case 'Dynamic Pages':
            return <Code>{'[issue].xml'}</Code>;
        case 'Page Files':
            return <Code>{'src/pages/index.xml'}</Code>;
        case 'longlink':
            return <Code>{'<longlink />'}</Code>;
        case 'State':
            return <Code>{'<State id="form" />'}</Code>;
        case 'Query':
            return <Code>{'<Query id="orders" />'}</Code>;
        case 'Action':
            return <Button label="Run" size="sm" variant="primary" />;
        case 'For':
            return <Code>{'<For each="$items" />'}</Code>;
        case 'Button':
            return (
                <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                    <Button label="Save" size="sm" variant="primary" />
                    <Button label="Edit" size="sm" variant="secondary" />
                    <Button label="View" size="sm" variant="ghost" />
                </Stack>
            );
        case 'ButtonGroup':
            return (
                <ButtonGroup label="Document actions" size="sm">
                    <Button label="Copy" variant="secondary" />
                    <Button label="Paste" variant="secondary" />
                </ButtonGroup>
            );
        case 'Link':
            return (
                <Link href={pageElementHrefByName.Link} type="inherit" hasUnderline>
                    Docs
                </Link>
            );
        case 'Card':
            return (
                <Stack gap={1} align="center">
                    <Text weight="semibold">Card surface</Text>
                    <Text type="supporting">Grouped content</Text>
                </Stack>
            );
        case 'Avatar':
            return <Avatar name="Ada Lovelace" size="lg" />;
        case 'Code':
            return <Code>order.status</Code>;
        case 'Heading':
            return <Heading level={3}>Orders</Heading>;
        case 'Icon':
            return <Info aria-hidden="true" className="text-accent" size={20} />;
        case 'Text':
            return <Text type="supporting">Readable text</Text>;
        case 'CheckboxInput':
            return <CheckboxInput label="Approved" size="sm" value onChange={() => undefined} />;
        case 'FileInput':
            return (
                <Stack width={140}>
                    <FileInput
                        accept=".pdf"
                        isLabelHidden
                        label="Attachment"
                        mode="input"
                        placeholder="File"
                        value={null}
                        onChange={() => undefined}
                    />
                </Stack>
            );
        case 'NumberInput':
            return (
                <NumberInput
                    isLabelHidden
                    label="Quantity"
                    min={1}
                    size="sm"
                    units="qty"
                    value={3}
                    width={130}
                    onChange={() => undefined}
                />
            );
        case 'RadioList':
            return (
                <Stack width={150}>
                    <RadioList
                        label="Plan"
                        orientation="horizontal"
                        size="sm"
                        value="team"
                        onChange={() => undefined}
                        isLabelHidden
                    >
                        <RadioListItem label="Solo" value="solo" />
                        <RadioListItem label="Team" value="team" />
                    </RadioList>
                </Stack>
            );
        case 'RadioListItem':
            return <Code>{'<RadioListItem />'}</Code>;
        case 'Selector':
            return (
                <Selector
                    label="Status"
                    options={[
                        { value: 'open', label: 'Open' },
                        { value: 'closed', label: 'Closed' },
                    ]}
                    size="sm"
                    value="open"
                    width={120}
                    onChange={() => undefined}
                    isLabelHidden
                />
            );
        case 'SelectorOption':
            return <Code>{'<SelectorOption />'}</Code>;
        case 'Slider':
            return (
                <Stack width={150}>
                    <Slider label="Progress" value={60} valueDisplay="none" onChange={() => undefined} isLabelHidden />
                </Stack>
            );
        case 'Switch':
            return <Switch label="Enabled" value onChange={() => undefined} />;
        case 'TextArea':
            return (
                <Stack width={150}>
                    <TextArea
                        isLabelHidden
                        label="Notes"
                        rows={1}
                        size="sm"
                        value="Review complete"
                        onChange={() => undefined}
                    />
                </Stack>
            );
        case 'TextInput':
            return (
                <TextInput
                    isLabelHidden
                    label="Name"
                    size="sm"
                    value="New order"
                    width={140}
                    onChange={() => undefined}
                />
            );
        case 'Badge':
            return <Badge label="Open" variant="info" />;
        case 'Banner':
            return <Banner status="success" title="Saved" />;
        case 'Divider':
            return (
                <Stack gap={3} width="100%">
                    <Text type="supporting">Before</Text>
                    <Divider />
                    <Text type="supporting">After</Text>
                </Stack>
            );
        case 'FormLayout':
            return (
                <Stack width={150}>
                    <FormLayout direction="vertical">
                        <TextInput isLabelHidden label="Title" size="sm" value="Request" onChange={() => undefined} />
                        <CheckboxInput label="Active" size="sm" value onChange={() => undefined} />
                    </FormLayout>
                </Stack>
            );
        case 'Grid':
            return (
                <Grid columns={2} gap={2}>
                    <Badge label="One" />
                    <Badge label="Two" />
                    <Badge label="Three" />
                    <Badge label="Four" />
                </Grid>
            );
        case 'Stack':
            return (
                <Stack gap={2} align="center">
                    <Badge label="First" />
                    <Badge label="Second" />
                    <Badge label="Third" />
                </Stack>
            );
        case 'SideNav':
            return <Code>{'<SideNav />'}</Code>;
        case 'SideNavItem':
            return <Code>{'<SideNavItem />'}</Code>;
        case 'Tab':
            return <Code>{'<Tab />'}</Code>;
        case 'TabList':
            return (
                <Stack width={170}>
                    <TabList aria-label="Preview tabs" size="sm" value="overview" onChange={() => undefined}>
                        <Tab label="Overview" value="overview" />
                        <Tab label="Activity" value="activity" />
                    </TabList>
                </Stack>
            );
        case 'Dialog':
            return <Code>{'<Dialog />'}</Code>;
        case 'Table':
            return (
                <Stack width={170}>
                    <AstryxTable columns={previewColumns} data={previewRows} density="compact" />
                </Stack>
            );
        case 'TableColumn':
            return <Code>{'<TableColumn />'}</Code>;
        default:
            return <Code>{`<${name} />`}</Code>;
    }
}

export const content = (
    <Stack gap={5}>
        <Heading id="pages" level={1}>
            Pages
        </Heading>
        <Text as="p">
            Pages define the XML UI returned by SDK page handlers. Use this page as the component map for LongLink
            Applications: start with LongLink state elements, then compose the screen with supported Astryx-backed XML
            components.
        </Text>
        <Text as="p">
            XML files live under <Code>src/pages</Code> and are registered by the LongLink SDK. Keep visible copy in{' '}
            <Code>src/i18n</Code>, bind state with <Code>$state.path</Code>, and use expressions only at XML runtime
            boundaries. Open a card below for that element&apos;s definition, attributes, child contract, and XML
            example.
        </Text>
        {componentCategories.map((category) => (
            <ComponentCategorySection key={category.id} category={category} />
        ))}
    </Stack>
);
