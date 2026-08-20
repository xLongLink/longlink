import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Tab, Tabs } from '@/components/ui/Tabs';
import { Stack } from '@astryxdesign/core/Stack';
import { Divider } from '@/components/ui/Divider';
import { Link as RouterLink } from 'react-router';
import { componentDocumentation } from '@/lib/xsd';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Slider } from '@astryxdesign/core/Slider';
import { Switch } from '@astryxdesign/core/Switch';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Selector } from '@astryxdesign/core/Selector';
import { TextArea } from '@astryxdesign/core/TextArea';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { FileInput } from '@astryxdesign/core/FileInput';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Table, TableColumn } from '@/components/ui/Table';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Menu, MenuItem, MenuSection } from '@/components/ui/Menu';
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';

const noop = () => undefined;

function SummaryCard({
    children,
    name,
    padding = 0,
    path,
}: {
    children: React.ReactNode;
    name: string;
    padding?: 0 | 3;
    path: string;
}) {
    const component = componentDocumentation.find((candidate) => candidate.name === name);

    return (
        <Stack className="relative" gap={2}>
            <Card aria-hidden="true" inert padding={padding} variant="muted">
                <Center axis={padding === 3 ? 'vertical' : 'both'} minHeight={padding === 3 ? 166 : 190}>
                    {children}
                </Center>
            </Card>
            <Text color="secondary" type="supporting">
                {name}
            </Text>
            <RouterLink
                aria-label={`Open ${name} documentation`}
                className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                to={component ? `/docs/sdk/pages/${component.slug}` : path}
            />
        </Stack>
    );
}

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

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Heading id="pages" level={1}>
                    Pages
                </Heading>
                <Text as="p">
                    Pages define the XML UI returned by SDK page handlers and are based on{' '}
                    <Link href="https://astryx.atmeta.com/" hasUnderline isExternalLink type="inherit">
                        Astryx
                    </Link>
                    . Use this page as the component map for LongLink Applications: start with LongLink state elements,
                    then compose the screen with supported XML components.
                </Text>
                <CodeBlock code={'<longlink>\n  Welcome\n</longlink>'} language="xml" />
                <Stack gap={3}>
                    <Heading id="longlink-runtime-concepts" level={2}>
                        Runtime
                    </Heading>
                    <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                        <SummaryCard name="if" path="/docs/sdk/pages/if">
                            <Code>{'if="${order.open}"'}</Code>
                        </SummaryCard>
                        <SummaryCard name="Expressions" path="/docs/sdk/pages/expressions">
                            <Code>{'${order.total > 0}'}</Code>
                        </SummaryCard>
                        <SummaryCard name="Bindings" path="/docs/sdk/pages/bindings">
                            <Code>{'value="$form.name"'}</Code>
                        </SummaryCard>
                    </Grid>
                </Stack>
                <Stack gap={3}>
                    <Heading id="longlink-state-elements" level={2}>
                        State
                    </Heading>
                    <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                        <SummaryCard name="State" path="/docs/sdk/pages/state">
                            <Code>{'<State />'}</Code>
                        </SummaryCard>
                        <SummaryCard name="Query" path="/docs/sdk/pages/query">
                            <Code>{'<Query />'}</Code>
                        </SummaryCard>
                        <SummaryCard name="Action" path="/docs/sdk/pages/action">
                            <Code>{'<Action />'}</Code>
                        </SummaryCard>
                        <SummaryCard name="For" path="/docs/sdk/pages/for">
                            <Code>{'<For />'}</Code>
                        </SummaryCard>
                    </Grid>
                </Stack>
                <Stack gap={3}>
                    <Heading id="action" level={2}>
                        Action
                    </Heading>
                    <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                        <SummaryCard name="Button" path="/docs/sdk/pages/button">
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                <Button label="Save" size="sm" variant="primary" />
                                <Button label="Edit" size="sm" variant="secondary" />
                                <Button label="View" size="sm" variant="ghost" />
                            </Stack>
                        </SummaryCard>
                        <SummaryCard name="Link" path="/docs/sdk/pages/link">
                            <Link href="/docs/sdk/pages/link" type="inherit" hasUnderline>
                                Docs
                            </Link>
                        </SummaryCard>
                    </Grid>
                </Stack>
                <Stack gap={3}>
                    <Heading id="content" level={2}>
                        Content
                    </Heading>
                    <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                        <SummaryCard name="Avatar" path="/docs/sdk/pages/avatar">
                            <Avatar name="Ada Lovelace" size="lg" />
                        </SummaryCard>
                        <SummaryCard name="Heading" path="/docs/sdk/pages/heading">
                            <Heading className="mt-0" level={3}>
                                Orders
                            </Heading>
                        </SummaryCard>
                        <SummaryCard name="Text" path="/docs/sdk/pages/text">
                            <Text>
                                Normal <b>bold</b> and <i>italic</i> text.
                            </Text>
                        </SummaryCard>
                        <SummaryCard name="Icon" path="/docs/sdk/pages/icon">
                            <Info aria-hidden="true" className="text-accent" size={20} />
                        </SummaryCard>
                        <SummaryCard name="Badge" path="/docs/sdk/pages/badge">
                            <Badge variant="info">Open</Badge>
                        </SummaryCard>
                        <SummaryCard name="Divider" path="/docs/sdk/pages/divider">
                            <Stack justify="center" minHeight={150} width="100%">
                                <Divider>{'Or'}</Divider>
                            </Stack>
                        </SummaryCard>
                    </Grid>
                </Stack>
                <Stack gap={3}>
                    <Heading id="form" level={2}>
                        Form
                    </Heading>
                    <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                        <SummaryCard name="CheckboxInput" path="/docs/sdk/pages/checkbox-input">
                            <CheckboxInput label="Approved" size="sm" value onChange={noop} />
                        </SummaryCard>
                        <SummaryCard name="FileInput" path="/docs/sdk/pages/file-input">
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
                        </SummaryCard>
                        <SummaryCard name="NumberInput" path="/docs/sdk/pages/number-input">
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
                        </SummaryCard>
                        <SummaryCard name="RadioList" path="/docs/sdk/pages/radio-list">
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
                        </SummaryCard>
                        <SummaryCard name="Selector" path="/docs/sdk/pages/selector">
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
                        </SummaryCard>
                        <SummaryCard name="Slider" path="/docs/sdk/pages/slider">
                            <Stack width={150}>
                                <Slider label="Progress" value={60} valueDisplay="none" onChange={noop} isLabelHidden />
                            </Stack>
                        </SummaryCard>
                        <SummaryCard name="Switch" path="/docs/sdk/pages/switch">
                            <Switch label="Enabled" value onChange={noop} />
                        </SummaryCard>
                        <SummaryCard name="TextArea" path="/docs/sdk/pages/text-area">
                            <Stack width={150}>
                                <TextArea
                                    isLabelHidden
                                    label="Notes"
                                    rows={1}
                                    size="sm"
                                    value="Review complete"
                                    onChange={noop}
                                />
                            </Stack>
                        </SummaryCard>
                        <SummaryCard name="TextInput" path="/docs/sdk/pages/text-input">
                            <TextInput
                                isLabelHidden
                                label="Name"
                                size="sm"
                                value="New order"
                                width={140}
                                onChange={noop}
                            />
                        </SummaryCard>
                    </Grid>
                </Stack>
                <Stack gap={3}>
                    <Heading id="layout" level={2}>
                        Layout
                    </Heading>
                    <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                        <SummaryCard name="Card" path="/docs/sdk/pages/card">
                            <Card elevation="low" padding={3}>
                                Lorem ipsum dolor sit amet.
                            </Card>
                        </SummaryCard>
                        <SummaryCard name="Grid" path="/docs/sdk/pages/grid">
                            <Grid columns={2} gap={2} justify="center">
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                            </Grid>
                        </SummaryCard>
                        <SummaryCard name="Menu" padding={3} path="/docs/sdk/pages/menu">
                            <Menu>
                                <MenuSection title="Settings">
                                    <MenuItem label="General" />
                                    <MenuItem label="Workflow" />
                                </MenuSection>
                            </Menu>
                        </SummaryCard>
                        <SummaryCard name="Stack" path="/docs/sdk/pages/stack">
                            <Stack align="center" gap={2} width="100%">
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                            </Stack>
                        </SummaryCard>
                        <SummaryCard name="Tabs" path="/docs/sdk/pages/tabs">
                            <Tabs>
                                <Tab label="Overview" value="overview" />
                                <Tab label="Activity" value="activity" />
                            </Tabs>
                        </SummaryCard>
                        <SummaryCard name="Dialog" path="/docs/sdk/pages/dialog">
                            <Dialog
                                aria-label="Dialog preview"
                                isInline
                                isOpen
                                purpose="info"
                                width={160}
                                onOpenChange={noop}
                            >
                                <Layout
                                    className="relative"
                                    header={
                                        <LayoutHeader className="absolute right-1 top-1 z-10" padding={0}>
                                            <Stack direction="horizontal" justify="end">
                                                <Button
                                                    icon={<Icon icon="close" size="sm" />}
                                                    isIconOnly
                                                    label="Close dialog"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={noop}
                                                />
                                            </Stack>
                                        </LayoutHeader>
                                    }
                                >
                                    <LayoutContent padding={3}>
                                        <Center minHeight={64} width="100%">
                                            <Text>Content</Text>
                                        </Center>
                                    </LayoutContent>
                                </Layout>
                            </Dialog>
                        </SummaryCard>
                        <SummaryCard name="Table" path="/docs/sdk/pages/table">
                            <Stack width={170}>
                                <Table data={[{ item: 'Order', status: 'Open' }]} density="compact">
                                    <TableColumn field="item" header="Item" />
                                    <TableColumn field="status" header="Status" />
                                </Table>
                            </Stack>
                        </SummaryCard>
                    </Grid>
                </Stack>
            </Stack>
        </Article>
    );
}
