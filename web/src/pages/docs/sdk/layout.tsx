import type { ReactNode } from 'react';
import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { CodeBlock } from '@/components/CodeBlock';

/** Renders paragraph text in the layout reference. */
function P({ children }: { children: ReactNode }) {
    return <Text as="p">{children}</Text>;
}

/** Renders a bulleted list in the layout reference. */
function Ul({ children }: { children: ReactNode }) {
    return <List listStyle="disc">{children}</List>;
}

/** Renders one bulleted item in the layout reference. */
function Li({ children }: { children: ReactNode }) {
    return <ListItem label={<Text>{children}</Text>} />;
}

export const metadata = {
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/layout.tsx',
};

export const content = (
    <Stack gap={4}>
        <Heading id="layout" level={1}>
            Layout
        </Heading>
        <P>
            XML v2 uses Stack, Grid, Card, and FormLayout for composition. The old Columns, Flex, and Hero elements are
            removed. Tabs and dialogs now use one flat owner component instead of compound trigger, header, and content
            tags.
        </P>

        <Stack gap={3}>
            <Heading id="stack" level={2}>
                Stack
            </Heading>
            <P>
                Stack arranges children vertically by default. Set <Code>direction=&quot;horizontal&quot;</Code> for row
                layout. It replaces Flex as well as simple list-like visual groups.
            </P>
            <Ul>
                <Li>
                    <Code>justify</Code>: <Code>start</Code>, <Code>center</Code>, <Code>end</Code>,{' '}
                    <Code>between</Code>, <Code>around</Code>, or <Code>evenly</Code>.
                </Li>
                <Li>
                    <Code>align</Code>: <Code>start</Code>, <Code>center</Code>, <Code>end</Code>, or{' '}
                    <Code>stretch</Code>.
                </Li>
                <Li>
                    <Code>gap</Code> and padding attributes use the Astryx spacing scale: 0, 0.5, 1, 1.5, 2, 3, 4, 5, 6,
                    8, or 10.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<Stack direction="horizontal" justify="between" align="center" gap="3">
  <Text i18n="orders.summary" />
  <Button i18n="orders.open" />
</Stack>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="grid" level={2}>
                Grid
            </Heading>
            <P>
                Grid replaces Columns. Use a fixed numeric <Code>columns</Code> value or create a responsive grid with{' '}
                <Code>minColumnWidth</Code>, optional <Code>maxColumns</Code>, and <Code>repeat</Code> set to{' '}
                <Code>fill</Code> or <Code>fit</Code>.
            </P>
            <CodeBlock language="xml">{`<Grid minColumnWidth="280" maxColumns="3" repeat="fit" gap="4">
  <Card><Text i18n="dashboard.first" /></Card>
  <Card><Text i18n="dashboard.second" /></Card>
</Grid>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="card" level={2}>
                Card
            </Heading>
            <P>
                Card groups related content on an Astryx surface. Variants include <Code>default</Code>,{' '}
                <Code>transparent</Code>, <Code>muted</Code>, and named color surfaces. Width and height attributes
                accept CSS strings or numeric expressions.
            </P>
            <CodeBlock language="xml">{`<Card variant="muted" padding="4" maxWidth="640px">
  <Stack gap="2">
    <Heading level="2" i18n="orders.summary" />
    <Text i18n="orders.description" />
  </Stack>
</Card>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="form-layout" level={2}>
                FormLayout
            </Heading>
            <P>
                FormLayout provides consistent spacing for controls that own their labels and descriptions. Direction
                can be <Code>vertical</Code>, <Code>horizontal</Code>, or <Code>horizontal-labels</Code>.
            </P>
            <CodeBlock language="xml">{`<FormLayout direction="vertical">
  <TextInput i18n="customers.fields.name" value="$customer.name" />
  <TextArea i18n="customers.fields.notes" value="$customer.notes" />
</FormLayout>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="page-introductions" level={2}>
                Page Introductions
            </Heading>
            <P>
                Hero and its slot tags are removed. Compose an introduction from Heading, Text, Stack, and optional
                actions so its semantics stay explicit.
            </P>
            <CodeBlock language="xml">{`<Stack gap="3">
  <Heading level="1" i18n="orders.title" />
  <Text as="p" color="secondary" i18n="orders.description" />
  <Link to="/orders/new" i18n="orders.create" hasUnderline="true" />
</Stack>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="tab-list" level={2}>
                TabList
            </Heading>
            <P>
                TabList replaces Tabs. It requires one or more direct Tab children and an accessible literal{' '}
                <Code>label</Code>. Each Tab requires a stable <Code>value</Code> and a <Code>label</Code> or{' '}
                <Code>i18n</Code> key. A writable <Code>value</Code> binding stores the selected tab.
            </P>
            <CodeBlock language="xml">{`<State id="view" value="overview" />
<TabList label="Order views" value="$view" hasDivider="true">
  <Tab value="overview" i18n="orders.tabs.overview">
    <Text i18n="orders.overview" />
  </Tab>
  <Tab value="activity" i18n="orders.tabs.activity">
    <Table data="$events" rowName="event">
      <TableColumn key="message" field="message" i18n="orders.events.message" />
    </Table>
  </Tab>
</TabList>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="dialog" level={2}>
                Dialog
            </Heading>
            <P>
                Dialog owns its header, open state, optional trigger, and content. It requires a <Code>title</Code> or{' '}
                <Code>i18n</Code> key. Set <Code>triggerLabel</Code> for an adapter-owned trigger, or bind{' '}
                <Code>isOpen</Code> to state when another flow controls the dialog.
            </P>
            <Ul>
                <Li>
                    <Code>purpose</Code>: <Code>required</Code>, <Code>form</Code>, or <Code>info</Code>.
                </Li>
                <Li>
                    <Code>variant</Code>: <Code>standard</Code> or <Code>fullscreen</Code>.
                </Li>
                <Li>
                    <Code>triggerVariant</Code> and <Code>triggerSize</Code>: configure the optional trigger button.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<Dialog i18n="orders.create.title" triggerLabel="Create order" purpose="form">
  <FormLayout>
    <TextInput i18n="orders.fields.name" value="$draft.name" isRequired="true" />
  </FormLayout>
  <Action action="/api/orders" json="\${{ name: draft.name }}">
    <Button variant="primary" i18n="orders.create.submit" />
  </Action>
</Dialog>`}</CodeBlock>
        </Stack>
    </Stack>
);
