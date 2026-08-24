import { Info } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Tab, Tabs } from '@/components/ui/Tabs';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Link as RouterLink } from 'react-router';
import { componentDocumentation } from '@/lib/xsd';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Slider } from '@astryxdesign/core/Slider';
import { Switch } from '@astryxdesign/core/Switch';
import { Divider } from '@astryxdesign/core/Divider';
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
    path?: string;
}) {
    const component = componentDocumentation.find((candidate) => candidate.name === name);
    const destination = component === undefined ? path : `/docs/sdk/pages/${component.slug}`;

    if (destination === undefined) {
        throw new Error(`Missing documentation route for ${name}`);
    }

    return (
        <Stack className="relative" gap={2}>
            <Card aria-hidden="true" inert padding={padding} variant="muted">
                <Center
                    className="scale-90"
                    axis={padding === 3 ? 'vertical' : 'both'}
                    minHeight={padding === 3 ? 166 : 190}
                >
                    {children}
                </Center>
            </Card>
            <Text color="secondary" type="supporting">
                {name}
            </Text>
            <RouterLink
                aria-label={`Open ${name} documentation`}
                className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                to={destination}
            />
        </Stack>
    );
}

const metadata = {
    toc: [
        { id: 'pages', label: 'Pages', level: 1 },
        { id: 'longlink-runtime-concepts', label: 'Runtime', level: 2 },
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
                        <SummaryCard name="Expressions" path="/docs/sdk/pages/expressions">
                            <Code>{'${order.total > 0}'}</Code>
                        </SummaryCard>
                        <SummaryCard name="Bindings" path="/docs/sdk/pages/bindings">
                            <Code>{'value="$form.name"'}</Code>
                        </SummaryCard>
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
                        <SummaryCard name="Button">
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                <Button label="Save" size="sm" variant="primary" />
                                <Button label="Edit" size="sm" variant="secondary" />
                                <Button label="View" size="sm" variant="ghost" />
                            </Stack>
                        </SummaryCard>
                        <SummaryCard name="Link">
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
                        <SummaryCard name="Avatar">
                            <Avatar name="Ada Lovelace" size="lg" />
                        </SummaryCard>
                        <SummaryCard name="Heading">
                            <Heading className="mt-0" level={3}>
                                Orders
                            </Heading>
                        </SummaryCard>
                        <SummaryCard name="Text">
                            <Text>
                                Normal <b>bold</b> and <i>italic</i> text.
                            </Text>
                        </SummaryCard>
                        <SummaryCard name="Icon">
                            <Info aria-hidden="true" className="text-accent" size={20} />
                        </SummaryCard>
                        <SummaryCard name="Badge">
                            <Badge label="Open" variant="info" />
                        </SummaryCard>
                        <SummaryCard name="Divider">
                            <Stack justify="center" minHeight={150} width="100%">
                                <Divider label="Or" />
                            </Stack>
                        </SummaryCard>
                    </Grid>
                </Stack>
                <Stack gap={3}>
                    <Heading id="form" level={2}>
                        Form
                    </Heading>
                    <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                        <SummaryCard name="CheckboxInput">
                            <CheckboxInput label="Approved" size="sm" value onChange={noop} />
                        </SummaryCard>
                        <SummaryCard name="FileInput">
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
                        <SummaryCard name="NumberInput">
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
                        <SummaryCard name="RadioList">
                            <Stack width={170}>
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
                        <SummaryCard name="Selector">
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
                        <SummaryCard name="Slider">
                            <Stack width={150}>
                                <Slider label="Progress" value={60} valueDisplay="none" onChange={noop} isLabelHidden />
                            </Stack>
                        </SummaryCard>
                        <SummaryCard name="Switch">
                            <Switch label="Enabled" size="sm" value onChange={noop} />
                        </SummaryCard>
                        <SummaryCard name="TextArea">
                            <Stack width={150}>
                                <TextArea
                                    isLabelHidden
                                    label="Notes"
                                    rows={2}
                                    size="sm"
                                    value="Review complete"
                                    onChange={noop}
                                />
                            </Stack>
                        </SummaryCard>
                        <SummaryCard name="TextInput">
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
                        <SummaryCard name="Card">
                            <Card elevation="low" padding={3}>
                                Lorem ipsum dolor sit amet.
                            </Card>
                        </SummaryCard>
                        <SummaryCard name="Grid">
                            <Grid columns={2} gap={2} justify="center">
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                            </Grid>
                        </SummaryCard>
                        <SummaryCard name="Menu" padding={3}>
                            <Menu>
                                <MenuSection title="Settings">
                                    <MenuItem label="General" />
                                    <MenuItem label="Workflow" />
                                </MenuSection>
                            </Menu>
                        </SummaryCard>
                        <SummaryCard name="Stack">
                            <Stack align="center" gap={2} width="100%">
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                                <div aria-hidden="true" className="h-5 w-16 rounded-full bg-neutral" />
                            </Stack>
                        </SummaryCard>
                        <SummaryCard name="Tabs">
                            <Tabs>
                                <Tab label="Overview" value="overview" />
                                <Tab label="Activity" value="activity" />
                            </Tabs>
                        </SummaryCard>
                        <SummaryCard name="Dialog">
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
                        <SummaryCard name="Table">
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
