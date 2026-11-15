import { MapsExample } from './views/maps';
import { TextExample } from './views/text';
import { InputExample } from './views/input';
import { TableExample } from './views/table';
import { SelectExample } from './views/select';
import { SliderExample } from './views/slider';
import { SwitchExample } from './views/switch';
import { Link as RouterLink } from 'react-router';
import { CheckboxExample } from './views/checkbox';
import { ComboboxExample } from './views/combobox';
import { DropdownExample } from './views/dropdown';
import { ProgressExample } from './views/progress';
import { TextareaExample } from './views/textarea';
import { FileText, ImageIcon } from 'lucide-react';
import { FileTypeExample } from './views/file-type';
import { Button } from '@/components/shadcn/button';
import { ChartExample } from './views/chart-example';
import { TimestampExample } from './views/timestamp';
import { Box } from '@/components/longlink/layout/box';
import { RadioGroupExample } from './views/radio-group';
import { Grid } from '@/components/longlink/layout/grid';
import { Icon } from '@/components/longlink/display/icon';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { InlineCode } from '@/components/shadcn/inline-code';
import { componentDocumentation } from '@/platform/publications';
import { Currency } from '@/components/longlink/display/currency';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { viewHooks, documentationCategories } from '@/lib/documentation';
import { Avatar, AvatarGroup } from '@/components/longlink/display/avatar';
import { Heading as ViewHeading } from '@/components/longlink/display/heading';
import { DocumentationArticle } from '@/platform/layouts/documentation-article';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/shadcn/collapsible';
import { Card, CardTitle, CardHeader, CardFooter, CardContent, CardDescription } from '@/components/shadcn/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';
import {
    CodeBlock,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle
} from '@/components/reui/code-block/code-block';

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
        Avatar: (
            <AvatarGroup className="items-center">
                <Avatar name="Ada Lovelace" shape="circle" size="sm" />
                <Avatar name="Ada Lovelace" shape="circle" size="md" />
                <Avatar name="Ada Lovelace" shape="circle" size="lg" />
            </AvatarGroup>
        ),
        FileType: <FileTypeExample />,
        Badge: (
            <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="primary">primary</Badge>
                <Badge variant="secondary">secondary</Badge>
                <Badge variant="destructive">destructive</Badge>
                <Badge variant="outline">outline</Badge>
            </div>
        ),
        Button: <Button>Button</Button>,
        Box: <Box width={160} maxWidth="100%" height={96} background="outline" />,
        Card: (
            <Card>
                <CardContent>Lorem ipsum dolor sit amet.</CardContent>
            </Card>
        ),
        Checkbox: <CheckboxExample />,
        Currency: <Currency value={1275.5} currency="CHF" />,
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
        Dropdown: <DropdownExample />,
        Empty: <Empty icon="folder-code" title="No projects" />,
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
        Grid: (
            <Grid columns={2} gap={2}>
                <Badge variant="outline" size="xl">
                    Grid 1
                </Badge>
                <Badge variant="outline" size="xl">
                    Grid 2
                </Badge>
                <Badge variant="outline" size="xl">
                    Grid 3
                </Badge>
                <Badge variant="outline" size="xl">
                    Grid 4
                </Badge>
            </Grid>
        ),
        // Keep article section spacing out of the centered heading thumbnail.
        Heading: (
            <Stack className="[&_:is(h1,h2,h3,h4,h5,h6)]:mt-0">
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
            <nav aria-label="Settings" className="flex w-full flex-col gap-0.5">
                <Button
                    nativeButton={false}
                    render={<a href="#profile" />}
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start"
                    aria-current="location"
                >
                    Profile
                </Button>
                <Button
                    nativeButton={false}
                    render={<a href="#workflow" />}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                >
                    Workflow
                </Button>
            </nav>
        ),
        Progress: <ProgressExample />,
        RadioGroup: <RadioGroupExample />,
        Select: <SelectExample />,
        Combobox: <ComboboxExample />,
        Slider: <SliderExample />,
        Stack: (
            <Stack direction="horizontal" gap={2}>
                <Badge variant="outline" size="xl">
                    Cell 1
                </Badge>
                <Badge variant="outline" size="xl">
                    Cell 2
                </Badge>
                <Badge variant="outline" size="xl">
                    Cell 3
                </Badge>
            </Stack>
        ),
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
        Timestamp: <TimestampExample />
    })
);

/** Renders the native JSX catalog generated from the shared editor declarations. */
export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="views">
                    Views
                </h1>
                <p>
                    Create each interface as a .jsx file exporting a default React component. LongLink supplies UI
                    components, hooks such as useState() and useEffect(), fragments, queries, and scoped requests
                    directly, without imports or a React. prefix. Your Python Solution needs no frontend build.
                </p>
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
                <Collapsible>
                    <CollapsibleTrigger render={<Button type="button" variant="ghost" />}>
                        API reference
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <Table wrap>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>API</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[
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
                                ].map((row) => (
                                    <TableRow key={row.name}>
                                        <TableCell>
                                            <Stack gap={0}>
                                                <InlineCode className="self-start">{row.name}</InlineCode>
                                                <span className="text-xs text-muted-foreground">{row.description}</span>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CollapsibleContent>
                </Collapsible>
                {documentationCategories
                    .filter((category) => category !== 'Runtime')
                    .map((category) => (
                        <Stack key={category} gap={3}>
                            <h2
                                className="font-semibold tracking-tight text-3xl"
                                id={category.toLowerCase().replace(/\W+/g, '-')}
                            >
                                {category}
                            </h2>
                            <Grid columns={3} gap={4}>
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
                                            <span className="text-xs text-muted-foreground">
                                                {component.category === 'Action' || component.category === 'Form'
                                                    ? component.label.replace(/([a-z])([A-Z])/g, '$1 $2')
                                                    : component.label}
                                            </span>
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
