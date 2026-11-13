import { GridExample } from './views/grid';
import { MapsExample } from './views/maps';
import { TextExample } from './views/text';
import { InputExample } from './views/input';
import { StackExample } from './views/stack';
import { TableExample } from './views/table';
import { AvatarExample } from './views/avatar';
import { SelectExample } from './views/select';
import { SliderExample } from './views/slider';
import { SwitchExample } from './views/switch';
import { Grid } from '@/components/custom/grid';
import { Icon } from '@/components/custom/icon';
import { Badge } from '@/components/reui/badge';
import { StepperExample } from './views/stepper';
import { Link as RouterLink } from 'react-router';
import { CheckboxInputExample } from './views/checkbox-input';
import { ComboboxExample } from './views/combobox';
import { ProgressExample } from './views/progress';
import { TextareaExample } from './views/textarea';
import { Button } from '@/components/shadcn/button';
import { ChartExample } from './views/chart-example';
import { TimestampExample } from './views/timestamp';
import { DateInputExample } from './views/date-input';
import { FileInputExample } from './views/file-input';
import { TimeInputExample } from './views/time-input';
import { Divider } from '@/components/custom/divider';
import { RadioGroupExample } from './views/radio-group';
import { Currency } from '@/components/custom/currency';
import { DropdownMenuExample } from './views/dropdown-menu';
import { Disclosure } from '@/components/custom/disclosure';
import { FileText, FolderCode, ImageIcon } from 'lucide-react';
import { componentDocumentation } from '@/platform/publications';
import { DocumentationArticle } from '@/components/layouts/article';
import { Heading as ViewHeading } from '@/components/custom/heading';
import { NativeText as Text } from '@/components/custom/native-text';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DataTable, proportional } from '@/components/custom/data-table';
import { viewHooks, documentationCategories } from '@/lib/documentation';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/shadcn/empty';
import { Card, CardTitle, CardHeader, CardFooter, CardContent, CardDescription } from '@/components/shadcn/card';
import {
    CodeBlock,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle
} from '@/components/reui/code-block/code-block';
import '@/platform/components/settings-navigation.css';

const article = {
    description: 'Build interfaces with LongLink Views and components.',
    toc: [
        { id: 'views', label: 'Views', level: 1 },
        ...documentationCategories
            .filter((category) => category !== 'Runtime')
            .map((category) => ({ id: category.toLowerCase().replace(/\W+/g, '-'), label: category, level: 2 }))
    ],
    lastUpdated: '2026-10-02',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/sdk/longlink/.static/jsx/frontend.d.ts',
    title: 'Views | LongLink Documentation'
};

// Reuse page-owned examples as inert catalog artwork, without a shared preview implementation.
const previews = new Map(
    Object.entries({
        AreaChart: <ChartExample name="AreaChart" height={160} isCompact />,
        BarChart: <ChartExample name="BarChart" height={160} isCompact />,
        LineChart: <ChartExample name="LineChart" height={160} isCompact />,
        PieChart: <ChartExample name="PieChart" height={160} isCompact />,
        RadarChart: <ChartExample name="RadarChart" height={160} isCompact />,
        RadialBarChart: <ChartExample name="RadialBarChart" height={160} isCompact />,
        Sankey: <ChartExample name="Sankey" height={160} isCompact />,
        Maps: (
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden [&_svg]:h-full! [&_svg]:w-[200%] [&_svg]:max-w-none [&_svg]:shrink-0">
                <MapsExample />
            </div>
        ),
        Avatar: <AvatarExample />,
        Badge: (
            <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="secondary">Draft</Badge>
                <Badge variant="warning-light">Pending</Badge>
                <Badge variant="success-light">Paid</Badge>
            </div>
        ),
        Button: <Button>Button</Button>,
        Card: (
            <Card>
                <CardContent>Lorem ipsum dolor sit amet.</CardContent>
            </Card>
        ),
        CheckboxInput: <CheckboxInputExample />,
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
        Empty: (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <FolderCode aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No projects</EmptyTitle>
                </EmptyHeader>
            </Empty>
        ),
        FileInput: <FileInputExample />,
        FileViewer: (
            <Card className="aspect-[3/4] w-2/5 bg-white text-black" aria-label="PDF document preview">
                <CardHeader>
                    <FileText className="size-6 text-neutral-500" aria-hidden="true" />
                </CardHeader>
                <CardContent className="flex flex-col gap-2" aria-hidden="true">
                    <div className="h-1 w-full bg-neutral-200" />
                    <div className="h-1 w-full bg-neutral-200" />
                    <div className="h-1 w-4/5 bg-neutral-200" />
                    <div className="mt-2 h-1 w-full bg-neutral-200" />
                    <div className="h-1 w-3/5 bg-neutral-200" />
                </CardContent>
            </Card>
        ),
        Grid: <GridExample />,
        // Keep article section spacing out of the centered heading thumbnail.
        Heading: (
            <Stack className="[&_:is(.native-heading,.view-heading)]:mt-0">
                <ViewHeading level={1}>Heading</ViewHeading>
            </Stack>
        ),
        Icon: (
            <div className="flex items-center gap-4">
                <Icon icon="info" size="md" />
                <Icon icon="check" size="md" />
                <Icon icon="clock" size="md" />
            </div>
        ),
        Image: (
            <Card className="aspect-[4/3] w-2/5 items-center justify-center" role="img" aria-label="Image preview">
                <ImageIcon className="size-10 text-muted-foreground" aria-hidden="true" />
            </Card>
        ),
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
        Progress: <ProgressExample />,
        RadioGroup: <RadioGroupExample />,
        Select: <SelectExample />,
        Combobox: <ComboboxExample />,
        Slider: <SliderExample />,
        Stack: <StackExample />,
        Stepper: <StepperExample />,
        Switch: <SwitchExample />,
        Table: <TableExample />,
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
        Textarea: <TextareaExample />,
        TimeInput: <TimeInputExample />,
        Timestamp: <TimestampExample />
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
                >
                    <CodeBlockHeader>
                        <CodeBlockTitle>items/[item].jsx</CodeBlockTitle>
                        <CodeBlockCopyButton className="ml-auto" />
                    </CodeBlockHeader>
                </CodeBlock>
                <Disclosure trigger="API reference" defaultOpen={false}>
                    <DataTable
                        idKey="name"
                        density="compact"
                        verticalAlign="top"
                        data={[
                            {
                                name: 'navigate(path)',
                                description:
                                    'Navigates within the current Solution or opens an HTTP(S) URL in a new tab. External URLs require user activation and open without an opener or referrer.'
                            },
                            {
                                name: 'request(path, options)',
                                description:
                                    'Requests a Solution operation and returns its data. Options support the HTTP method, JSON, form data, and binary responses. Successful writes refresh cached View data. Failed HTTP requests reject with an Error containing an optional numeric status and a bounded client-facing message.'
                            },
                            ...viewHooks
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
                                )
                            }
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
                            <Grid columns={{ minWidth: 190, max: 3, repeat: 'fill' }} gap={4}>
                                {componentDocumentation
                                    .filter((component) => component.category === category)
                                    .map((component) => (
                                        <Stack key={component.slug} className="relative min-w-0" gap={2}>
                                            <Card
                                                aria-hidden="true"
                                                inert
                                                size="sm"
                                                className={`aspect-square w-full max-w-full ${component.name === 'Maps' ? 'py-0' : ''}`}
                                            >
                                                {/* Constrain artwork before scaling so intrinsic control sizes cannot widen the card. */}
                                                <div className="flex min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden">
                                                    <Stack
                                                        className={`min-w-0 [&>*]:min-w-0 [&>*]:max-w-full ${component.name.endsWith('Chart') || component.name === 'Maps' ? '' : 'scale-90'}`}
                                                        width="100%"
                                                        maxWidth="100%"
                                                        align={
                                                            component.category === 'Form' &&
                                                            !['Checkbox', 'RadioGroup', 'Switch'].includes(
                                                                component.name
                                                            )
                                                                ? 'stretch'
                                                                : 'center'
                                                        }
                                                        gap={0}
                                                    >
                                                        {previews.get(component.name) ?? (
                                                            <InlineCode>{`<${component.name} />`}</InlineCode>
                                                        )}
                                                    </Stack>
                                                </div>
                                            </Card>
                                            <Text type="supporting">
                                                {component.category === 'Action' || component.category === 'Form'
                                                    ? component.label.replace(/([a-z])([A-Z])/g, '$1 $2')
                                                    : component.label}
                                                {' · '}
                                                {component.sourceLabel}
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
