import { GridExample } from './views/Grid';
import { IconExample } from './views/Icon';
import { MapsExample } from './views/Maps';
import { TextExample } from './views/Text';
import { Form } from '@/components/ui/Form';
import { Grid } from '@/components/ui/Grid';
import { BadgeExample } from './views/Badge';
import { InputExample } from './views/Input';
import { StackExample } from './views/Stack';
import { TableExample } from './views/Table';
import { TokenExample } from './views/Token';
import { AvatarExample } from './views/Avatar';
import { SelectExample } from './views/Select';
import { SliderExample } from './views/Slider';
import { SwitchExample } from './views/Switch';
import { Button } from '@/components/ui/Button';
import { HeadingExample } from './views/Heading';
import { StepperExample } from './views/Stepper';
import { Divider } from '@/components/ui/Divider';
import { Link as RouterLink } from 'react-router';
import { ComboboxExample } from './views/Combobox';
import { MoreMenuExample } from './views/MoreMenu';
import { ProgressExample } from './views/Progress';
import { SelectorExample } from './views/Selector';
import { TextAreaExample } from './views/TextArea';
import { ChartExample } from './views/ChartExample';
import { Currency } from '@/components/ui/Currency';
import { DataTableExample } from './views/DataTable';
import { DateInputExample } from './views/DateInput';
import { FileInputExample } from './views/FileInput';
import { RadioListExample } from './views/RadioList';
import { TextInputExample } from './views/TextInput';
import { TimeInputExample } from './views/TimeInput';
import { TimestampExample } from './views/Timestamp';
import { ActionMenuExample } from './views/ActionMenu';
import { EmptyStateExample } from './views/EmptyState';
import { FileViewerExample } from './views/FileViewer';
import { Disclosure } from '@/components/ui/Disclosure';
import { CollapsibleExample } from './views/Collapsible';
import { NumberInputExample } from './views/NumberInput';
import { DropdownMenuExample } from './views/DropdownMenu';
import { CheckboxInputExample } from './views/CheckboxInput';
import { MultiSelectorExample } from './views/MultiSelector';
import { NativeText as Text } from '@/components/ui/NativeText';
import { componentDocumentation } from '@/platform/publications';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { DocumentationArticle } from '@/components/layouts/Article';
import { DataTable, proportional } from '@/components/custom/DataTable';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';
import { viewHooks, documentationCategories } from '@/lib/documentation';
import { NativeCodeBlock as CodeBlock } from '@/components/ui/NativeCodeBlock';
import {
    Card,
    CardTitle,
    CardHeader,
    CardFooter,
    CardContent,
    CardDescription,
    InteractiveCard,
} from '@/components/ui/Card';
import '@/platform/components/settings-navigation.css';

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
        AreaChart: <ChartExample name="AreaChart" height={160} isCompact />,
        BarChart: <ChartExample name="BarChart" height={160} isCompact />,
        LineChart: <ChartExample name="LineChart" height={160} isCompact />,
        PieChart: <ChartExample name="PieChart" height={160} isCompact />,
        RadarChart: <ChartExample name="RadarChart" height={160} isCompact />,
        RadialChart: <ChartExample name="RadialChart" height={160} isCompact />,
        SankeyChart: <ChartExample name="SankeyChart" height={160} isCompact />,
        Maps: <MapsExample height={150} />,
        Avatar: <AvatarExample />,
        Badge: <BadgeExample />,
        Button: <Button>Button</Button>,
        Card: (
            <Card>
                <CardContent>Lorem ipsum dolor sit amet.</CardContent>
            </Card>
        ),
        CheckboxInput: <CheckboxInputExample />,
        Collapsible: <CollapsibleExample />,
        Currency: <Currency value={1275.5} currency="CHF" />,
        DateInput: <DateInputExample />,
        Dialog: (
            <Card size="sm" className="w-full">
                <CardHeader>
                    <CardTitle>Order details</CardTitle>
                    <CardDescription>Review this order.</CardDescription>
                </CardHeader>
                <CardFooter className="justify-end gap-2">
                    <Button size="xs" variant="outline">
                        Cancel
                    </Button>
                    <Button size="xs">Continue</Button>
                </CardFooter>
            </Card>
        ),
        Divider: <Divider label="or" />,
        DropdownMenu: <DropdownMenuExample />,
        ActionMenu: <ActionMenuExample />,
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
            <Stack className="[&_:is(.native-heading,.view-heading)]:mt-0">
                <HeadingExample />
            </Stack>
        ),
        Icon: <IconExample />,
        Input: <InputExample />,
        Link: <span className="underline">Link</span>,
        // Show only the navigation in the thumbnail; the full Menu has a fixed-width sidebar and content panel.
        Menu: (
            <nav aria-label="Settings" className="settings-navigation w-full">
                <a href="#profile" aria-current="location">
                    Profile
                </a>
                <a href="#workflow">Workflow</a>
            </nav>
        ),
        MoreMenu: <MoreMenuExample />,
        MultiSelector: <MultiSelectorExample />,
        NumberInput: <NumberInputExample />,
        Progress: <ProgressExample />,
        RadioList: <RadioListExample />,
        Selector: <SelectorExample />,
        Select: <SelectExample />,
        Combobox: <ComboboxExample />,
        Slider: <SliderExample />,
        Stack: <StackExample />,
        Stepper: <StepperExample orientation="vertical" />,
        Switch: <SwitchExample />,
        Table: <TableExample />,
        DataTable: <DataTableExample />,
        Token: <TokenExample />,
        // Keep the thumbnail focused on the tab strip rather than its panel content.
        Tabs: (
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
            </Tabs>
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
                <Disclosure trigger="API reference" defaultIsOpen={false}>
                    <DataTable
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
                                    'Requests a Solution operation and returns its data. Options support the HTTP method, JSON, form data, and binary responses. Successful writes refresh cached View data. Failed HTTP requests reject with an Error containing an optional numeric status and a bounded client-facing message.',
                            },
                            ...viewHooks,
                        ]}
                        columns={[
                            {
                                key: 'name',
                                header: 'API',
                                width: proportional(1),
                                renderCell: (api) => (
                                    <Stack gap={0}>
                                        <InlineCode className="self-start">{api.name}</InlineCode>
                                        <Text type="supporting">{api.description}</Text>
                                    </Stack>
                                ),
                            },
                        ]}
                    />
                </Disclosure>
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
                                            <InteractiveCard
                                                aria-hidden="true"
                                                inert
                                                padding={component.name.endsWith('Chart') ? 0 : 3}
                                                isClipped
                                                variant="muted"
                                                width="100%"
                                                maxWidth="100%"
                                            >
                                                {/* Constrain artwork before scaling so intrinsic control sizes cannot widen the card. */}
                                                <div className="flex h-40 w-full min-w-0 items-center justify-center overflow-hidden">
                                                    <Stack
                                                        className={`min-w-0 [&>*]:min-w-0 [&>*]:max-w-full ${component.name.endsWith('Chart') ? '' : 'scale-90'}`}
                                                        width="100%"
                                                        maxWidth="100%"
                                                        align={component.category === 'Form' ? 'stretch' : 'center'}
                                                        gap={0}
                                                    >
                                                        {previews.get(component.name) ?? (
                                                            <InlineCode>{`<${component.name} />`}</InlineCode>
                                                        )}
                                                    </Stack>
                                                </div>
                                            </InteractiveCard>
                                            <Text type="supporting">
                                                {component.category === 'Action' || component.category === 'Form'
                                                    ? component.label.replace(/([a-z])([A-Z])/g, '$1 $2')
                                                    : component.label}
                                            </Text>
                                            <RouterLink
                                                aria-label={`Open ${component.label} documentation`}
                                                className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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

import { InlineCode } from '@/components/shadcn/inline-code';
