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
import { ButtonExample } from './views/Buttons';
import { Code } from '@/components/astryx/Code';
import { Grid } from '@/components/astryx/Grid';
import { Link } from '@/components/astryx/Link';
import { Text } from '@/components/astryx/Text';
import { DividerExample } from './views/Divider';
import { HeadingExample } from './views/Heading';
import { StepperExample } from './views/Stepper';
import { Stack } from '@/components/astryx/Stack';
import { Link as RouterLink } from 'react-router';
import { MoreMenuExample } from './views/MoreMenu';
import { SelectorExample } from './views/Selector';
import { TextAreaExample } from './views/TextArea';
import { Center } from '@/components/astryx/Center';
import { Currency } from '@/components/ui/Currency';
import { DateInputExample } from './views/DateInput';
import { FileInputExample } from './views/FileInput';
import { RadioListExample } from './views/RadioList';
import { TextInputExample } from './views/TextInput';
import { TimeInputExample } from './views/TimeInput';
import { TimestampExample } from './views/Timestamp';
import { Heading } from '@/components/astryx/Heading';
import { EmptyStateExample } from './views/EmptyState';
import { FileViewerExample } from './views/FileViewer';
import { IconButtonExample } from './views/IconButton';
import { CollapsibleExample } from './views/Collapsible';
import { NumberInputExample } from './views/NumberInput';
import { ProgressBarExample } from './views/ProgressBar';
import { CodeBlock } from '@/components/astryx/CodeBlock';
import { DropdownMenuExample } from './views/DropdownMenu';
import { MetadataListExample } from './views/MetadataList';
import { Tab, TabList } from '@/components/astryx/TabList';
import { Blockquote } from '@/components/astryx/Blockquote';
import { CheckboxInputExample } from './views/CheckboxInput';
import { MultiSelectorExample } from './views/MultiSelector';
import { Collapsible } from '@/components/astryx/Collapsible';
import { Table, proportional } from '@/components/astryx/Table';
import { componentDocumentation } from '@/platform/publications';
import { DocumentationArticle } from '@/components/layouts/Article';
import { viewHooks, documentationCategories } from '@/lib/documentation';
import { SideNav, SideNavItem, SideNavSection } from '@/components/astryx/SideNav';

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
                                        <Code className="self-start">{api.name}</Code>
                                        <Text type="supporting">{api.description}</Text>
                                    </Stack>
                                ),
                            },
                        ]}
                    />
                </Collapsible>
                <Heading level={2}>Compact confirmations</Heading>
                <Text as="p">
                    Use useConfirm() for title-only Continue/Cancel confirmations. Render its element once; no separate
                    open state is needed. Description is optional. Cancel receives initial focus and Escape cancels;
                    backdrop clicks do not dismiss. While an action runs, loading prevents repeated submissions and
                    dismissal, including hide() and replacement through show(). Success closes the confirmation; failure
                    keeps it open for retry. Scoped request failures are reported by the host; other failures appear in
                    the dialog. Focus returns to the trigger after dismissal.
                </Text>
                <CodeBlock
                    language="jsx"
                    title="variants.jsx"
                    hasLanguageLabel={false}
                    code={`export default function Variants() {
  const confirmation = useConfirm();

  return (
    <>
      <Button label="Nuova variante" onClick={() => confirmation.show({
        title: 'Conferma variante A',
        cancelLabel: 'Annulla',
        actionLabel: 'Continua',
        onAction: async () => {
          await request('/api/variants', {
            method: 'POST',
            json: { variant: 'A' },
          });
        },
      })} />
      {confirmation.element}
    </>
  );
}`}
                />
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
