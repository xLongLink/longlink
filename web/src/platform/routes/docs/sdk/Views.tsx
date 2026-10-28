import { GridExample } from './views/Grid';
import { IconExample } from './views/Icon';
import { LinkExample } from './views/Link';
import { TextExample } from './views/Text';
import { Card } from '@/components/ui/Card';
import { Form } from '@/components/ui/Form';
import { BadgeExample } from './views/Badge';
import { StackExample } from './views/Stack';
import { TableExample } from './views/Table';
import { TokenExample } from './views/Token';
import { AvatarExample } from './views/Avatar';
import { DialogExample } from './views/Dialog';
import { SliderExample } from './views/Slider';
import { SwitchExample } from './views/Switch';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { ButtonExample } from './views/Buttons';
import { DividerExample } from './views/Divider';
import { HeadingExample } from './views/Heading';
import { StepperExample } from './views/Stepper';
import { Stack } from '@astryxdesign/core/Stack';
import { Link as RouterLink } from 'react-router';
import { MoreMenuExample } from './views/MoreMenu';
import { SelectorExample } from './views/Selector';
import { TextAreaExample } from './views/TextArea';
import { Center } from '@astryxdesign/core/Center';
import { Currency } from '@/components/ui/Currency';
import { DateInputExample } from './views/DateInput';
import { FileInputExample } from './views/FileInput';
import { RadioListExample } from './views/RadioList';
import { TextInputExample } from './views/TextInput';
import { TimeInputExample } from './views/TimeInput';
import { TimestampExample } from './views/Timestamp';
import { Heading } from '@astryxdesign/core/Heading';
import { EmptyStateExample } from './views/EmptyState';
import { FileViewerExample } from './views/FileViewer';
import { IconButtonExample } from './views/IconButton';
import { CollapsibleExample } from './views/Collapsible';
import { NumberInputExample } from './views/NumberInput';
import { ProgressBarExample } from './views/ProgressBar';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { DropdownMenuExample } from './views/DropdownMenu';
import { MetadataListExample } from './views/MetadataList';
import { componentDocumentation } from '@/platform/routes';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { CheckboxInputExample } from './views/CheckboxInput';
import { MultiSelectorExample } from './views/MultiSelector';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { documentationCategories } from '@/lib/documentation';
import { Table, proportional } from '@astryxdesign/core/Table';
import { DocumentationArticle } from '@/components/layouts/Article';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';

const article = {
    description: 'Build interfaces with LongLink Views and components.',
    toc: [
        { id: 'views', label: 'Views', level: 1 },
        ...documentationCategories
            .filter((category) => category !== 'Runtime')
            .map((category) => ({
                id: category.toLowerCase().replace(/\W+/g, '-'),
                label: category,
                level: 2,
            })),
    ],
    lastUpdated: '2026-10-02',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/sdk/longlink/.static/jsx/frontend.d.ts',
    title: 'Views | LongLink Documentation',
};

// Reuse page-owned examples as inert catalog artwork, without a shared preview implementation.
const previews = new Map(
    Object.entries({
        Avatar: <AvatarExample />,
        Badge: <BadgeExample />,
        Button: <ButtonExample />,
        Card: <Card>Lorem ipsum dolor sit amet.</Card>,
        CheckboxInput: <CheckboxInputExample />,
        Collapsible: <CollapsibleExample />,
        Currency: <Currency value={1275.5} currency="CHF" />,
        DateInput: <DateInputExample />,
        Dialog: <DialogExample />,
        Divider: <DividerExample />,
        DropdownMenu: <DropdownMenuExample />,
        EmptyState: <EmptyStateExample />,
        FileInput: <FileInputExample />,
        FileViewer: <FileViewerExample />,
        Form: (
            <Form action="/api/items">
                <TextInputExample />
            </Form>
        ),
        Grid: <GridExample />,
        // Keep article section spacing out of the centered heading thumbnail.
        Heading: (
            <Stack className="[&_.astryx-heading]:mt-0">
                <HeadingExample />
            </Stack>
        ),
        Icon: <IconExample />,
        IconButton: <IconButtonExample />,
        Link: <LinkExample />,
        // Show only the navigation in the thumbnail; the full Menu has a fixed-width sidebar and content panel.
        Menu: (
            <SideNav className="h-auto w-full">
                <SideNavSection title="Settings">
                    <SideNavItem label="Profile" isSelected size="sm" />
                    <SideNavItem label="Workflow" size="sm" />
                </SideNavSection>
            </SideNav>
        ),
        MetadataList: <MetadataListExample />,
        MoreMenu: <MoreMenuExample />,
        MultiSelector: <MultiSelectorExample />,
        NumberInput: <NumberInputExample />,
        ProgressBar: <ProgressBarExample />,
        RadioList: <RadioListExample />,
        Selector: <SelectorExample />,
        Slider: <SliderExample />,
        Stack: <StackExample />,
        Stepper: <StepperExample orientation="vertical" />,
        Switch: <SwitchExample />,
        Table: <TableExample />,
        Token: <TokenExample />,
        // Keep the thumbnail focused on the tab strip rather than its panel content.
        Tabs: (
            <TabList value="overview" onChange={() => undefined} size="sm">
                <Tab label="Overview" value="overview" />
                <Tab label="Activity" value="activity" />
            </TabList>
        ),
        Text: <TextExample />,
        TextArea: <TextAreaExample />,
        TextInput: <TextInputExample />,
        TimeInput: <TimeInputExample />,
        Timestamp: <TimestampExample />,
    })
);

/** Renders the native JSX catalog generated from the shared editor declarations. */
export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="views" level={1}>
                    Views
                </Heading>
                <Blockquote className="border-s-(--color-text-orange) text-(--color-text-orange)">
                    <Stack gap={0}>
                        <Text type="inherit">Beta notice: This page is being built.</Text>
                        <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                            Edit on GitHub
                        </Link>
                    </Stack>
                </Blockquote>
                <Text as="p">
                    Create each interface as a .jsx file exporting a default React component. LongLink supplies UI
                    components, hooks such as useState() and useEffect(), fragments, queries, and scoped requests
                    directly, without imports or a React. prefix. Your Python Solution needs no frontend build.
                </Text>
                <CodeBlock
                    code={`/** @param {ViewProps} props */
export default function Item({ params }) {
  const [item] = useApi(\`/api/items/\${params.item}\`);

  return <Heading>{item.name}</Heading>;
}`}
                    language="jsx"
                    title="items/[item].jsx"
                    hasLanguageLabel={false}
                />
                <Collapsible trigger="API reference" chevronPosition="start" defaultIsOpen={false}>
                    <Table
                        idKey="name"
                        density="compact"
                        verticalAlign="top"
                        data={[
                            {
                                name: 'navigate(path)',
                                description:
                                    'Navigates within the current Solution or opens an HTTP(S) URL in a new tab. External URLs require user activation and open without an opener or referrer.',
                            },
                            {
                                name: 'request(path, options)',
                                description:
                                    'Requests a Solution operation and returns its data. Options support the HTTP method, JSON, form data, and binary responses. Requests and responses are limited to 2,000,000 bytes, with at most 32 form entries and 8 pending operations. Successful writes refresh cached View data. Failed HTTP requests reject with an Error containing an optional numeric status and a bounded client-facing message.',
                            },
                            {
                                name: 'useState(initial)',
                                description:
                                    'Returns the current state and a setter. Pass a value or an initializer function; updates can use the previous state.',
                            },
                            {
                                name: 'useEffect(effect, dependencies)',
                                description:
                                    'Synchronizes with external systems after rendering. Return a cleanup function to release timers or subscriptions. Include every reactive value used by the effect in its dependencies.',
                            },
                            {
                                name: 'useMemo(factory, dependencies)',
                                description:
                                    'Caches a calculated value until its dependencies change. Use it for expensive calculations, not required application state.',
                            },
                            {
                                name: 'useRef(initial)',
                                description:
                                    'Returns a stable object with a mutable current property. Changing current does not trigger a render.',
                            },
                            {
                                name: 'useApi(path)',
                                description:
                                    'Returns Solution data and an awaitable invalidator scoped to the full request path. The renderer handles initial loading, errors, and retry.',
                            },
                        ]}
                        columns={[
                            {
                                key: 'name',
                                header: 'API',
                                width: proportional(1),
                                renderCell: (api) => (
                                    <Stack gap={0}>
                                        <Code className="self-start">{api.name}</Code>
                                        <Text type="supporting">{api.description}</Text>
                                    </Stack>
                                ),
                            },
                        ]}
                    />
                </Collapsible>
                {documentationCategories
                    .filter((category) => category !== 'Runtime')
                    .map((category) => (
                        <Stack key={category} gap={3}>
                            <Heading id={category.toLowerCase().replace(/\W+/g, '-')} level={2}>
                                {category}
                            </Heading>
                            <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                                {componentDocumentation
                                    .filter((component) => component.category === category)
                                    .map((component) => (
                                        <Stack key={component.slug} className="relative min-w-0" gap={2}>
                                            <Card
                                                aria-hidden="true"
                                                inert
                                                padding={3}
                                                variant="muted"
                                                width="100%"
                                                maxWidth="100%"
                                            >
                                                {/* Constrain artwork before scaling so intrinsic control sizes cannot widen the card. */}
                                                <Center className="h-40 min-w-0 overflow-hidden" width="100%">
                                                    <Stack
                                                        className="min-w-0 scale-90 [&>*]:min-w-0 [&>*]:max-w-full"
                                                        width="100%"
                                                        maxWidth="100%"
                                                        align={component.category === 'Form' ? 'stretch' : 'center'}
                                                        gap={0}
                                                    >
                                                        {previews.get(component.name) ?? (
                                                            <Code>{`<${component.name} />`}</Code>
                                                        )}
                                                    </Stack>
                                                </Center>
                                            </Card>
                                            <Text type="supporting">
                                                {component.category === 'Action' || component.category === 'Form'
                                                    ? component.label.replace(/([a-z])([A-Z])/g, '$1 $2')
                                                    : component.label}
                                            </Text>
                                            <RouterLink
                                                aria-label={`Open ${component.label} documentation`}
                                                className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                                to={`/docs/sdk/views/${component.slug}/`}
                                            />
                                        </Stack>
                                    ))}
                            </Grid>
                        </Stack>
                    ))}
            </Stack>
        </DocumentationArticle>
    );
}
