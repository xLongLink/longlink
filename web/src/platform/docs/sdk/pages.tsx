import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Divider } from '@astryxdesign/core/Divider';
import { FileInput } from '@astryxdesign/core/FileInput';
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
import { pageReferenceDocs, pageReferenceHrefByName } from '@/platform/docs/sdk/references';

type ComponentSummary = {
    name: string;
};

type ComponentCategoryConfiguration = {
    id: string;
    title: string;
};

type ComponentCategory = ComponentCategoryConfiguration & {
    components: ComponentSummary[];
};

const componentCategoryConfigurations: ComponentCategoryConfiguration[] = [
    {
        id: 'longlink-runtime-concepts',
        title: 'Runtime',
    },
    {
        id: 'longlink-state-elements',
        title: 'State',
    },
    {
        id: 'action',
        title: 'Action',
    },
    {
        id: 'content',
        title: 'Content',
    },
    {
        id: 'form',
        title: 'Form',
    },
    {
        id: 'layout',
        title: 'Layout',
    },
];

const componentCategories: ComponentCategory[] = componentCategoryConfigurations.map((category) => ({
    ...category,
    components: pageReferenceDocs
        .filter((component) => component.category === category.title)
        .map(({ name }) => ({ name })),
}));

const noop = () => undefined;

export const metadata = {
    toc: [
        { id: 'pages', label: 'Pages', level: 1 },
        ...componentCategories.map((category) => ({ id: category.id, label: category.title, level: 2 })),
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages.tsx',
};

/** Renders one categorized group of XML page components. */
function ComponentCategorySection({ category }: { category: ComponentCategory }) {
    return (
        <Stack gap={3}>
            <Heading id={category.id} level={2}>
                {category.title}
            </Heading>
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
    return (
        <Stack className="relative" gap={2}>
            <Card aria-hidden="true" inert minHeight={190} variant="muted">
                <Center minHeight={150}>{renderComponentPreview(component.name)}</Center>
            </Card>
            <Text color="secondary" type="supporting">
                {component.name}
            </Text>
            <RouterLink
                aria-label={`Open ${component.name} documentation`}
                className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                to={pageReferenceHrefByName[component.name]}
            />
        </Stack>
    );
}

/** Renders a compact live or symbolic preview for one XML page element. */
function renderComponentPreview(name: string) {
    switch (name) {
        case 'if':
            return <Code>{'if="${order.open}"'}</Code>;
        case 'Translations':
            return <Code>{'i18n="orders.title"'}</Code>;
        case 'values':
            return <Code>{'values="${{ name: user.name }}"'}</Code>;
        case 'count':
            return <Code>{'values="${{ count: orders.length }}"'}</Code>;
        case 'Expressions':
            return <Code>{'${order.total > 0}'}</Code>;
        case 'Bindings':
            return <Code>{'value="$form.name"'}</Code>;
        case 'longlink':
            return <Code>{'<longlink version="v1" />'}</Code>;
        case 'Button':
            return (
                <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                    <Button label="Save" size="sm" variant="primary" />
                    <Button label="Edit" size="sm" variant="secondary" />
                    <Button label="View" size="sm" variant="ghost" />
                </Stack>
            );
        case 'Link':
            return (
                <Link href={pageReferenceHrefByName.Link} type="inherit" hasUnderline>
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
        case 'Heading':
            return <Heading level={3}>Orders</Heading>;
        case 'Icon':
            return <Info aria-hidden="true" className="text-accent" size={20} />;
        case 'Text':
            return <Text type="supporting">Readable text</Text>;
        case 'CheckboxInput':
            return <CheckboxInput label="Approved" size="sm" value onChange={noop} />;
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
                        onChange={noop}
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
                    onChange={noop}
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
                        onChange={noop}
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
                    onChange={noop}
                    isLabelHidden
                />
            );
        case 'SelectorOption':
            return <Code>{'<SelectorOption />'}</Code>;
        case 'Slider':
            return (
                <Stack width={150}>
                    <Slider label="Progress" value={60} valueDisplay="none" onChange={noop} isLabelHidden />
                </Stack>
            );
        case 'Switch':
            return <Switch label="Enabled" value onChange={noop} />;
        case 'TextArea':
            return (
                <Stack width={150}>
                    <TextArea isLabelHidden label="Notes" rows={1} size="sm" value="Review complete" onChange={noop} />
                </Stack>
            );
        case 'TextInput':
            return <TextInput isLabelHidden label="Name" size="sm" value="New order" width={140} onChange={noop} />;
        case 'Badge':
            return <Badge label="Open" variant="info" />;
        case 'Divider':
            return (
                <Stack gap={3} width="100%">
                    <Text type="supporting">Before</Text>
                    <Divider />
                    <Text type="supporting">After</Text>
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
                    <TabList aria-label="Preview tabs" size="sm" value="overview" onChange={noop}>
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
                    <AstryxTable
                        columns={[
                            { key: 'item', header: 'Item' },
                            { key: 'status', header: 'Status' },
                        ]}
                        data={[{ item: 'Order', status: 'Open' }]}
                        density="compact"
                    />
                </Stack>
            );
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
            Pages define the XML UI returned by SDK page handlers and are based on{' '}
            <Link href="https://astryx.atmeta.com/" hasUnderline isExternalLink type="inherit">
                Astryx
            </Link>
            . Use this page as the component map for LongLink Applications: start with LongLink state elements, then
            compose the screen with supported XML components.
        </Text>
        <CodeBlock code={'<longlink version="v1">\n  <Text>Welcome</Text>\n</longlink>'} language="xml" />
        {componentCategories.map((category) => (
            <ComponentCategorySection key={category.id} category={category} />
        ))}
    </Stack>
);
