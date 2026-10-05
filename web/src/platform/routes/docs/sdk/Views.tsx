import type { ReactNode } from 'react';
import { GridExample } from './views/Grid';
import { IconExample } from './views/Icon';
import { LinkExample } from './views/Link';
import { MenuExample } from './views/Menu';
import { TabsExample } from './views/Tabs';
import { TextExample } from './views/Text';
import { Card } from '@/components/ui/Card';
import { BadgeExample } from './views/Badge';
import { StackExample } from './views/Stack';
import { TableExample } from './views/Table';
import { AvatarExample } from './views/Avatar';
import { DialogExample } from './views/Dialog';
import { SliderExample } from './views/Slider';
import { SwitchExample } from './views/Switch';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { DividerExample } from './views/Divider';
import { HeadingExample } from './views/Heading';
import { StepperExample } from './views/Stepper';
import { Stack } from '@astryxdesign/core/Stack';
import { Link as RouterLink } from 'react-router';
import { CalendarExample } from './views/Calendar';
import { MoreMenuExample } from './views/MoreMenu';
import { SelectorExample } from './views/Selector';
import { TextAreaExample } from './views/TextArea';
import { Center } from '@astryxdesign/core/Center';
import { Currency } from '@/components/ui/Currency';
import { CodeBlockExample } from './views/CodeBlock';
import { DateInputExample } from './views/DateInput';
import { FileInputExample } from './views/FileInput';
import { RadioListExample } from './views/RadioList';
import { StatusDotExample } from './views/StatusDot';
import { TextInputExample } from './views/TextInput';
import { TimeInputExample } from './views/TimeInput';
import { TimestampExample } from './views/Timestamp';
import { Heading } from '@astryxdesign/core/Heading';
import { EmptyStateExample } from './views/EmptyState';
import { FileViewerExample } from './views/FileViewer';
import { IconButtonExample } from './views/IconButton';
import { Article } from '@/components/layouts/Article';
import { CollapsibleExample } from './views/Collapsible';
import { NumberInputExample } from './views/NumberInput';
import { PowerSearchExample } from './views/PowerSearch';
import { ProgressBarExample } from './views/ProgressBar';
import { componentDocumentation } from '@/platform/docs';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { DropdownMenuExample } from './views/DropdownMenu';
import { MetadataListExample } from './views/MetadataList';
import { CheckboxInputExample } from './views/CheckboxInput';
import { DateTimeInputExample } from './views/DateTimeInput';
import { MultiSelectorExample } from './views/MultiSelector';
import { documentationCategories } from '@/lib/documentation';
import { DateRangeInputExample } from './views/DateRangeInput';
import { ComplexSelectorExample } from './views/ComplexSelector';
import { ButtonExample, ButtonGroupExample } from './views/Buttons';

const article = {
    description: 'Build interfaces with LongLink Views and components.',
    toc: [
        { id: 'views', label: 'Views', level: 1 },
        ...documentationCategories.map((category) => ({
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
const previews: Record<string, ReactNode> = {
    Avatar: <AvatarExample />,
    Badge: <BadgeExample />,
    Button: <ButtonExample />,
    ButtonGroup: <ButtonGroupExample />,
    Calendar: <CalendarExample />,
    Card: <Card>Lorem ipsum dolor sit amet.</Card>,
    CheckboxInput: <CheckboxInputExample />,
    CodeBlock: <CodeBlockExample />,
    Collapsible: <CollapsibleExample />,
    ComplexSelector: <ComplexSelectorExample />,
    Currency: <Currency value={1275.5} currency="CHF" />,
    DateInput: <DateInputExample />,
    DateRangeInput: <DateRangeInputExample />,
    DateTimeInput: <DateTimeInputExample />,
    Dialog: <DialogExample />,
    Divider: <DividerExample />,
    DropdownMenu: <DropdownMenuExample />,
    EmptyState: <EmptyStateExample />,
    FileInput: <FileInputExample />,
    FileViewer: <FileViewerExample />,
    Grid: <GridExample />,
    Heading: <HeadingExample />,
    Icon: <IconExample />,
    IconButton: <IconButtonExample />,
    Link: <LinkExample />,
    Menu: <MenuExample />,
    MetadataList: <MetadataListExample />,
    MoreMenu: <MoreMenuExample />,
    MultiSelector: <MultiSelectorExample />,
    NumberInput: <NumberInputExample />,
    PowerSearch: <PowerSearchExample />,
    ProgressBar: <ProgressBarExample />,
    RadioList: <RadioListExample />,
    Selector: <SelectorExample />,
    Slider: <SliderExample />,
    Stack: <StackExample />,
    StatusDot: <StatusDotExample />,
    Stepper: <StepperExample />,
    Switch: <SwitchExample />,
    Table: <TableExample />,
    Tabs: <TabsExample />,
    Text: <TextExample />,
    TextArea: <TextAreaExample />,
    TextInput: <TextInputExample />,
    TimeInput: <TimeInputExample />,
    Timestamp: <TimestampExample />,
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
                    Create each interface as a .jsx file exporting a default React component. LongLink supplies UI
                    components, hooks such as useState() and useEffect(), fragments, queries, and scoped requests
                    directly, without imports or a React. prefix. Your Python Solution needs no frontend build.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Why?</Text>
                    <Text as="p">
                        Keeping the interface separate from the application logic makes each part easier to understand
                        and maintain.
                    </Text>
                </Stack>
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
                {documentationCategories.map((category) => (
                    <Stack key={category} gap={3}>
                        <Heading id={category.toLowerCase().replace(/\W+/g, '-')} level={2}>
                            {category}
                        </Heading>
                        <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                            {componentDocumentation
                                .filter((component) => component.category === category)
                                .map((component) => (
                                    <Stack key={component.slug} className="relative" gap={2}>
                                        <Card aria-hidden="true" inert padding={3} variant="muted">
                                            <Center className="h-40 scale-90" width="100%">
                                                {component.category === 'Runtime' ? (
                                                    <Code>{component.name}</Code>
                                                ) : (
                                                    (previews[component.name] ?? <Code>{`<${component.name} />`}</Code>)
                                                )}
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
        </Article>
    );
}
