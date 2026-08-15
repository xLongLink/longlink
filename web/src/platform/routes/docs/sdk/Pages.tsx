import { Info } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Link as RouterLink } from 'react-router';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Slider } from '@astryxdesign/core/Slider';
import { Switch } from '@astryxdesign/core/Switch';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { Selector } from '@astryxdesign/core/Selector';
import { TextArea } from '@astryxdesign/core/TextArea';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { FileInput } from '@astryxdesign/core/FileInput';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Table as AstryxTable } from '@astryxdesign/core/Table';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { publicSeoMeta } from '@/lib/seo';
import { Article } from '@/components/layouts/Article';
import { Documentation } from '@/platform/layouts/Documentation';

type ComponentSummary = {
    name: string;
    path: string;
};

type ComponentCategoryConfiguration = {
    id: string;
    title: string;
};

type ComponentCategory = ComponentCategoryConfiguration & {
    components: ComponentSummary[];
};

const componentSummaries: (ComponentSummary & { category: string })[] = [
    { category: 'Runtime', path: '/docs/sdk/pages/if', name: 'if' },
    { category: 'Runtime', path: '/docs/sdk/pages/expressions', name: 'Expressions' },
    { category: 'Runtime', path: '/docs/sdk/pages/bindings', name: 'Bindings' },
    { category: 'State', path: '/docs/sdk/pages/state', name: 'State' },
    { category: 'State', path: '/docs/sdk/pages/query', name: 'Query' },
    { category: 'State', path: '/docs/sdk/pages/action', name: 'Action' },
    { category: 'State', path: '/docs/sdk/pages/for', name: 'For' },
    { category: 'Action', path: '/docs/sdk/pages/button', name: 'Button' },
    { category: 'Action', path: '/docs/sdk/pages/link', name: 'Link' },
    { category: 'Layout', path: '/docs/sdk/pages/card', name: 'Card' },
    { category: 'Content', path: '/docs/sdk/pages/avatar', name: 'Avatar' },
    { category: 'Content', path: '/docs/sdk/pages/heading', name: 'Heading' },
    { category: 'Content', path: '/docs/sdk/pages/icon', name: 'Icon' },
    { category: 'Content', path: '/docs/sdk/pages/text', name: 'Text' },
    { category: 'Form', path: '/docs/sdk/pages/checkbox-input', name: 'CheckboxInput' },
    { category: 'Form', path: '/docs/sdk/pages/file-input', name: 'FileInput' },
    { category: 'Form', path: '/docs/sdk/pages/number-input', name: 'NumberInput' },
    { category: 'Form', path: '/docs/sdk/pages/radio-list', name: 'RadioList' },
    { category: 'Form', path: '/docs/sdk/pages/radio-list-item', name: 'RadioListItem' },
    { category: 'Form', path: '/docs/sdk/pages/selector', name: 'Selector' },
    { category: 'Form', path: '/docs/sdk/pages/selector-option', name: 'SelectorOption' },
    { category: 'Form', path: '/docs/sdk/pages/slider', name: 'Slider' },
    { category: 'Form', path: '/docs/sdk/pages/switch', name: 'Switch' },
    { category: 'Form', path: '/docs/sdk/pages/text-area', name: 'TextArea' },
    { category: 'Form', path: '/docs/sdk/pages/text-input', name: 'TextInput' },
    { category: 'Content', path: '/docs/sdk/pages/badge', name: 'Badge' },
    { category: 'Layout', path: '/docs/sdk/pages/divider', name: 'Divider' },
    { category: 'Layout', path: '/docs/sdk/pages/grid', name: 'Grid' },
    { category: 'Layout', path: '/docs/sdk/pages/stack', name: 'Stack' },
    { category: 'Layout', path: '/docs/sdk/pages/side-nav', name: 'SideNav' },
    { category: 'Layout', path: '/docs/sdk/pages/tab', name: 'Tab' },
    { category: 'Layout', path: '/docs/sdk/pages/dialog', name: 'Dialog' },
    { category: 'Layout', path: '/docs/sdk/pages/table', name: 'Table' },
];

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
    components: componentSummaries.filter((component) => component.category === category.title),
}));

const noop = () => undefined;

export const metadata = {
    path: '/docs/sdk/pages',
    title: 'Pages',
    description: 'Build LongLink application pages with XML components, data bindings, and runtime metadata.',
    toc: [
        { id: 'pages', label: 'Pages', level: 1 },
        { id: 'longlink-runtime-concepts', label: 'Runtime', level: 2 },
        { id: 'longlink-state-elements', label: 'State', level: 2 },
        { id: 'action', label: 'Action', level: 2 },
        { id: 'content', label: 'Content', level: 2 },
        { id: 'form', label: 'Form', level: 2 },
        { id: 'layout', label: 'Layout', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Pages.tsx',
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
                <Center minHeight={150}>{renderComponentPreview(component)}</Center>
            </Card>
            <Text color="secondary" type="supporting">
                {component.name}
            </Text>
            <RouterLink
                aria-label={`Open ${component.name} documentation`}
                className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                to={component.path}
            />
        </Stack>
    );
}

/** Renders a compact live or symbolic preview for one XML page element. */
function renderComponentPreview({ name, path }: ComponentSummary) {
    switch (name) {
        case 'if':
            return <Code>{'if="${order.open}"'}</Code>;
        case 'Expressions':
            return <Code>{'${order.total > 0}'}</Code>;
        case 'Bindings':
            return <Code>{'value="$form.name"'}</Code>;
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
                <Link href={path} type="inherit" hasUnderline>
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
        case 'Tab':
            return <Code>{'<Tab />'}</Code>;
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

function Content() {
    return (
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
            <CodeBlock code={'<longlink>\n  <Text>Welcome</Text>\n</longlink>'} language="xml" />
            {componentCategories.map((category) => (
                <ComponentCategorySection key={category.id} category={category} />
            ))}
        </Stack>
    );
}

export const meta = () => publicSeoMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <Documentation>
            <Article
                page={{
                    ...metadata,
                    content: <Content />,
                    metadata,
                }}
            />
        </Documentation>
    );
}
