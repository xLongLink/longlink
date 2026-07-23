import type { ReactNode } from 'react';
import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { CodeBlock } from '@/components/CodeBlock';

/** Renders paragraph text in the component reference. */
function P({ children }: { children: ReactNode }) {
    return <Text as="p">{children}</Text>;
}

/** Renders a bulleted parameter list. */
function Ul({ children }: { children: ReactNode }) {
    return <List listStyle="disc">{children}</List>;
}

/** Renders one item in a documentation parameter list. */
function Li({ children }: { children: ReactNode }) {
    return <ListItem label={<Text>{children}</Text>} />;
}

export const metadata = {
    toc: [
        { id: 'text', label: 'Text, Heading, and Code' },
        { id: 'link', label: 'Link' },
        { id: 'icon', label: 'Icon' },
        { id: 'avatar', label: 'Avatar' },
        { id: 'badge', label: 'Badge' },
        { id: 'banner', label: 'Banner' },
        { id: 'divider', label: 'Divider' },
        { id: 'button', label: 'Button and ButtonGroup' },
        { id: 'text-inputs', label: 'TextInput, NumberInput, FileInput, and TextArea' },
        { id: 'boolean-and-range-inputs', label: 'CheckboxInput, Switch, and Slider' },
        { id: 'selector', label: 'Selector' },
        { id: 'radio-list', label: 'RadioList' },
        { id: 'table', label: 'Table' },
    ],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/components.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="components" level={1}>
            Components
        </Heading>
        <P>
            XML v2 exposes a small, data-oriented Astryx component set. The old HTML aliases and compound slot tags are
            not supported. Use component attributes for labels, values, and state, then compose components with Stack,
            Grid, Card, and FormLayout.
        </P>
        <P>
            Every interactive control needs an accessible <Code>label</Code> or <Code>i18n</Code> value. Localized
            interpolation data belongs in one <Code>values</Code> expression object; arbitrary placeholder attributes
            are rejected by the schema.
        </P>

        <Stack gap={3}>
            <Heading id="text" level={2}>
                Text, Heading, and Code
            </Heading>
            <P>
                Text replaces paragraph and inline HTML aliases. Heading requires an explicit semantic level from 1 to
                6. Both accept literal <Code>value</Code>, localized <Code>i18n</Code>, or nested XML content. Code
                renders inline code with the same content precedence.
            </P>
            <Ul>
                <Li>
                    <Code>values</Code>: expression resolving to an object used for translation placeholders.
                </Li>
                <Li>
                    <Code>count</Code>: numeric expression supplied to an ICU plural message.
                </Li>
                <Li>
                    <Code>Text as</Code>: <Code>span</Code>, <Code>p</Code>, <Code>div</Code>, or <Code>label</Code>.
                </Li>
                <Li>
                    <Code>Text type</Code>: <Code>body</Code>, <Code>large</Code>, <Code>label</Code>,{' '}
                    <Code>supporting</Code>, <Code>code</Code>, a display style, or <Code>inherit</Code>.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<Heading level="1" i18n="orders.title" />
<Text as="p" i18n="orders.summary" values="\${{ number: order.number, status: order.status }}" />
<Code value="$order.reference" />`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="link" level={2}>
                Link
            </Heading>
            <P>
                Link replaces the old anchor alias. Use <Code>to</Code> for application navigation and <Code>href</Code>{' '}
                for a URL. External destinations can set <Code>isExternalLink</Code>; translated link text uses{' '}
                <Code>i18n</Code>.
            </P>
            <CodeBlock language="xml">{`<Link to="/orders/\${order.id}" i18n="orders.open" hasUnderline="true" />
<Link href="$document.downloadUrl" i18n="documents.download" isExternalLink="true" />`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="icon" level={2}>
                Icon
            </Heading>
            <P>
                Icon renders a semantic Astryx icon name rather than a Lucide slug. Common names include{' '}
                <Code>info</Code>, <Code>success</Code>, <Code>warning</Code>, <Code>error</Code>, <Code>search</Code>,
                and <Code>wrench</Code>.
            </P>
            <CodeBlock language="xml">{`<Icon icon="info" size="sm" color="accent" />`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="avatar" level={2}>
                Avatar
            </Heading>
            <P>
                Avatar is a single data-oriented element. Set its image, fallback image, name, and alternative text as
                attributes instead of using image and fallback children. Sizes are <Code>xsm</Code>, <Code>sm</Code>,{' '}
                <Code>md</Code>, <Code>lg</Code>, and <Code>xl</Code>.
            </P>
            <CodeBlock language="xml">{`<Avatar src="$user.avatarUrl" name="$user.name" alt="$user.name" size="lg" />`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="badge" level={2}>
                Badge
            </Heading>
            <P>
                Badge requires a serializable <Code>label</Code> or an <Code>i18n</Code> key. Status variants include{' '}
                <Code>neutral</Code>, <Code>info</Code>, <Code>success</Code>, <Code>warning</Code>, and{' '}
                <Code>error</Code>.
            </P>
            <CodeBlock language="xml">{`<Badge label="$order.status" variant="info" />`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="banner" level={2}>
                Banner
            </Heading>
            <P>
                Banner displays persistent status information. It requires a <Code>title</Code> or <Code>i18n</Code> key
                and can expand to show child content.
            </P>
            <CodeBlock language="xml">{`<Banner status="warning" i18n="orders.reviewRequired">
  <Text i18n="orders.reviewInstructions" />
</Banner>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="divider" level={2}>
                Divider
            </Heading>
            <P>
                Divider replaces the horizontal-rule alias. It supports horizontal or vertical orientation, optional
                translated labels, and <Code>subtle</Code> or <Code>strong</Code> variants.
            </P>
            <CodeBlock language="xml">{`<Divider i18n="common.or" variant="strong" />`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="button" level={2}>
                Button and ButtonGroup
            </Heading>
            <P>
                Button requires a <Code>label</Code> or <Code>i18n</Code> key. Use <Code>isDisabled</Code>,{' '}
                <Code>isLoading</Code>, and <Code>isIconOnly</Code> for state. ButtonGroup accepts Button or Action
                children and also requires an accessible group label.
            </P>
            <Ul>
                <Li>
                    <Code>variant</Code>: <Code>primary</Code>, <Code>secondary</Code>, <Code>ghost</Code>, or{' '}
                    <Code>destructive</Code>.
                </Li>
                <Li>
                    <Code>type</Code>: <Code>button</Code>, <Code>submit</Code>, or <Code>reset</Code>.
                </Li>
                <Li>
                    <Code>append</Code> and <Code>item</Code>: append a resolved item to array state before running the
                    nearest Action.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<ButtonGroup label="Order actions">
  <Action action="/api/orders/\${order.id}/approve" method="PATCH">
    <Button variant="primary" i18n="orders.approve" />
  </Action>
  <Button isDisabled="$order.locked" i18n="orders.edit" />
</ButtonGroup>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="text-inputs" level={2}>
                TextInput, NumberInput, FileInput, and TextArea
            </Heading>
            <P>
                These controls replace Input, Textarea, Field, and InputGroup compounds. Each control owns its label,
                description, validation status, and value. A <Code>$state.path</Code> value creates a writable binding.
            </P>
            <Ul>
                <Li>
                    <Code>label</Code> or <Code>i18n</Code>: required accessible field label, even when{' '}
                    <Code>isLabelHidden</Code> is true.
                </Li>
                <Li>
                    <Code>isRequired</Code>, <Code>isOptional</Code>, <Code>isDisabled</Code>: explicit field states.
                </Li>
                <Li>
                    <Code>status</Code>: <Code>warning</Code>, <Code>error</Code>, or <Code>success</Code>, with
                    optional <Code>statusMessage</Code>.
                </Li>
                <Li>
                    NumberInput writes numbers. FileInput keeps File values available to Action <Code>form</Code>{' '}
                    payloads.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<State id="draft" title="" amount="0" notes="" file="\${null}" />

<FormLayout>
  <TextInput i18n="orders.fields.title" value="$draft.title" isRequired="true" />
  <NumberInput i18n="orders.fields.amount" value="$draft.amount" min="0" units="CHF" />
  <TextArea i18n="orders.fields.notes" value="$draft.notes" rows="4" />
  <FileInput i18n="orders.fields.attachment" value="$draft.file" accept=".pdf" />
</FormLayout>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="boolean-and-range-inputs" level={2}>
                CheckboxInput, Switch, and Slider
            </Heading>
            <P>
                Boolean and range controls also bind through <Code>value</Code>. Use a State object with a{' '}
                <Code>value</Code> field when the control owns the entire state slot.
            </P>
            <CodeBlock language="xml">{`<State id="accepted" value="false" />
<State id="notifications" value="true" />
<State id="budget" value="2500" />

<CheckboxInput label="Accept terms" value="$accepted" isRequired="true" />
<Switch label="Notifications" value="$notifications" />
<Slider label="Budget" value="$budget" min="500" max="10000" step="500" />`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="selector" level={2}>
                Selector
            </Heading>
            <P>
                Selector replaces the Select compound. It requires an accessible label and one or more flat
                SelectorOption children. Each option requires a <Code>value</Code> and uses <Code>label</Code> or{' '}
                <Code>i18n</Code> for visible text.
            </P>
            <CodeBlock language="xml">{`<State id="filters" status="open" />
<Selector i18n="filters.status" value="$filters.status" hasClear="true">
  <SelectorOption value="open" i18n="statuses.open" />
  <SelectorOption value="closed" i18n="statuses.closed" />
</Selector>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="radio-list" level={2}>
                RadioList
            </Heading>
            <P>
                RadioList replaces RadioGroup and contains flat RadioListItem children. The list and every item require
                accessible labels.
            </P>
            <CodeBlock language="xml">{`<State id="workflow" owner="manager" />
<RadioList i18n="workflow.owner" value="$workflow.owner">
  <RadioListItem value="manager" i18n="workflow.roles.manager" />
  <RadioListItem value="finance" i18n="workflow.roles.finance" />
</RadioList>`}</CodeBlock>
        </Stack>

        <Stack gap={3}>
            <Heading id="table" level={2}>
                Table
            </Heading>
            <P>
                Table replaces DataTable and its slot compounds. It consumes array data and flat TableColumn children.
                Every column needs a <Code>key</Code> or dotted <Code>field</Code>; use an explicit key for custom
                cells. Child content becomes the cell renderer and can read the configured row name, <Code>index</Code>,
                and <Code>value</Code>.
            </P>
            <Ul>
                <Li>
                    <Code>data</Code>: required expression resolving to an array of objects.
                </Li>
                <Li>
                    <Code>rowName</Code>: row variable exposed to custom cells. Defaults to <Code>row</Code>.
                </Li>
                <Li>
                    <Code>idKey</Code>: optional stable row identifier field.
                </Li>
                <Li>
                    <Code>emptyLabel</Code>: literal empty-state text.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<Query id="orders" path="/api/orders" />
<Table data="$orders" rowName="order" idKey="id" emptyLabel="No orders found.">
  <TableColumn key="number" field="number" i18n="orders.table.number" />
  <TableColumn key="customer" i18n="orders.table.customer">
    <Link to="/orders/\${order.id}" i18n="orders.open" />
  </TableColumn>
  <TableColumn key="status" i18n="orders.table.status">
    <Badge label="$order.status" variant="info" />
  </TableColumn>
</Table>`}</CodeBlock>
        </Stack>
    </Stack>
);
