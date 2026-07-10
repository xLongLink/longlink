import { CodeBlock } from '@/components/CodeBlock';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/components.tsx',
};

export const content = (
    <Stack>
        <Heading id="components" level="h2">
            Components
        </Heading>
        <P>
            Component elements cover form controls, text, lists, tables, and small visual building blocks used inside SDK
            XML pages.
        </P>
        <Stack className="gap-3">
            <Heading id="icon" level="h2">
                Icon
            </Heading>
            <P>Renders a Lucide icon by XML name. Blank or missing names fail fast.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>name</Code>: required Lucide icon name, usually kebab-case.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Icon name="settings" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="badge" level="h2">
                Badge
            </Heading>
            <P>Displays compact status, category, or count text.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>variant</Code>: optional <Code>default</Code>, <Code>outline</Code>, <Code>ghost</Code>,{' '}
                        <Code>destructive</Code>, or <Code>link</Code>.
                    </Li>
                    <Li>
                        <Code>value</Code>: optional expression value used as badge text.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Badge variant="outline" value="$order.status" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="avatar" level="h2">
                Avatar
            </Heading>
            <P>Avatar shell for user or record imagery with image, fallback, and badge slots.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Avatar Parameters</P>
                <Ul>
                    <Li>
                        <Code>size</Code>: optional <Code>default</Code>, <Code>sm</Code>, or <Code>lg</Code>. Defaults
                        to <Code>default</Code>.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">AvatarImage Parameters</P>
                <Ul>
                    <Li>
                        <Code>src</Code>: optional image URL.
                    </Li>
                    <Li>
                        <Code>alt</Code>: optional accessible image label.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Avatar size="lg">
  <AvatarImage src="/avatars/sam.png" alt="Sam" />
  <AvatarFallback i18n="..." />
  <AvatarBadge i18n="..." count="3" />
</Avatar>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="button" level="h2">
                Button
            </Heading>
            <P>Standard clickable button for local actions, form submission, or list append helpers.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>variant</Code>: optional <Code>default</Code>, <Code>outline</Code>, <Code>ghost</Code>,{' '}
                        <Code>destructive</Code>, or <Code>link</Code>.
                    </Li>
                    <Li>
                        <Code>size</Code>: optional button size.
                    </Li>
                    <Li>
                        <Code>submit</Code>: optional boolean. When <Code>true</Code>, renders type submit.
                    </Li>
                    <Li>
                        <Code>disabled</Code>: optional boolean expression.
                    </Li>
                    <Li>
                        <Code>append</Code> and <Code>item</Code>: optional helper that appends an item into a target
                        array state path.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Button variant="outline" disabled="form.saving" i18n="..." />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="buttongroup" level="h2">
                ButtonGroup
            </Heading>
            <P>Groups related buttons, inputs, text segments, and separators into one joined control.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">ButtonGroup Parameters</P>
                <Ul>
                    <Li>
                        <Code>orientation</Code>: optional <Code>horizontal</Code> or <Code>vertical</Code>. Defaults to{' '}
                        <Code>horizontal</Code>.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">ButtonGroupSeparator Parameters</P>
                <Ul>
                    <Li>
                        <Code>orientation</Code>: optional <Code>vertical</Code> or <Code>horizontal</Code>. Defaults to{' '}
                        <Code>vertical</Code>.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<ButtonGroup>
  <Button variant="outline" i18n="..." />
  <ButtonGroupSeparator />
  <ButtonGroupText i18n="..." page="1" />
  <Button i18n="..." />
</ButtonGroup>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="field" level="h2">
                Field
            </Heading>
            <P>
                Form field container that groups labels, legends, descriptions, and control content. FieldContent holds
                the interactive control, while FieldTitle and FieldDescription provide structured text inside labels or
                legends.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Field Parameters</P>
                <Ul>
                    <Li>
                        <Code>orientation</Code>: optional <Code>vertical</Code> or <Code>horizontal</Code>. Defaults to{' '}
                        <Code>vertical</Code>.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">FieldLegend Parameters</P>
                <Ul>
                    <Li>
                        <Code>variant</Code>: optional <Code>legend</Code> or <Code>label</Code>. Defaults to{' '}
                        <Code>legend</Code>.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">FieldLabel Parameters</P>
                <Ul>
                    <Li>
                        <Code>htmlFor</Code>: optional id of the associated control.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Field>
  <FieldLabel htmlFor="email">
    <FieldTitle i18n="..." />
    <FieldDescription i18n="..." />
  </FieldLabel>
  <FieldContent>
    <Input id="email" value="$form.email" />
  </FieldContent>
</Field>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="label" level="h2">
                Label
            </Heading>
            <P>Standalone form label when a full Field wrapper is unnecessary.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>htmlFor</Code>: optional id of the associated control.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Label htmlFor="search" i18n="..." />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="input" level="h2">
                Input
            </Heading>
            <P>Single-line text or number input. Writable value bindings update state as the user types.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>id</Code>: optional control id.
                    </Li>
                    <Li>
                        <Code>label</Code>: optional accessible label.
                    </Li>
                    <Li>
                        <Code>placeholder</Code>: optional placeholder text.
                    </Li>
                    <Li>
                        <Code>value</Code>: optional value or writable binding.
                    </Li>
                    <Li>
                        <Code>type</Code>: optional input type.
                    </Li>
                    <Li>
                        <Code>disabled</Code>: optional boolean.
                    </Li>
                    <Li>
                        <Code>autoComplete</Code>: optional browser autocomplete value.
                    </Li>
                    <Li>
                        <Code>aria-invalid</Code>: optional invalid state.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Input id="quantity" type="number" value="$form.quantity" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="textarea" level="h2">
                Textarea
            </Heading>
            <P>Multi-line text input. Writable value bindings update state as the user types.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>id</Code>: optional control id.
                    </Li>
                    <Li>
                        <Code>label</Code>: optional accessible label.
                    </Li>
                    <Li>
                        <Code>placeholder</Code>: optional placeholder text.
                    </Li>
                    <Li>
                        <Code>value</Code>: optional value or writable binding.
                    </Li>
                    <Li>
                        <Code>disabled</Code>: optional boolean.
                    </Li>
                    <Li>
                        <Code>cols</Code> and <Code>rows</Code>: optional numeric dimensions.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Textarea id="notes" rows="4" value="$form.notes" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="inputgroup" level="h2">
                InputGroup
            </Heading>
            <P>
                Composes inputs or textareas with addons, inline text, and buttons. InputGroupInput matches Input
                behavior, and InputGroupTextarea matches Textarea behavior.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">InputGroupAddon Parameters</P>
                <Ul>
                    <Li>
                        <Code>align</Code>: optional <Code>inline-start</Code> or <Code>inline-end</Code>. Defaults to{' '}
                        <Code>inline-start</Code>.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">InputGroupButton Parameters</P>
                <Ul>
                    <Li>
                        <Code>type</Code>: optional button type. Defaults to <Code>button</Code>.
                    </Li>
                    <Li>
                        <Code>size</Code>: optional size. Defaults to <Code>xs</Code>.
                    </Li>
                    <Li>
                        <Code>variant</Code>: optional variant. Defaults to <Code>ghost</Code>.
                    </Li>
                    <Li>
                        <Code>disabled</Code>: optional boolean.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">InputGroupInput Parameters</P>
                <Ul>
                    <Li>
                        <Code>id</Code>, <Code>label</Code>, <Code>placeholder</Code>, <Code>value</Code>,{' '}
                        <Code>type</Code>, <Code>disabled</Code>, <Code>autoComplete</Code>, and{' '}
                        <Code>aria-invalid</Code>: match Input.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">InputGroupTextarea Parameters</P>
                <Ul>
                    <Li>
                        <Code>id</Code>, <Code>label</Code>, <Code>placeholder</Code>, <Code>value</Code>,{' '}
                        <Code>disabled</Code>, <Code>cols</Code>, and <Code>rows</Code>: match Textarea.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<InputGroup>
  <InputGroupAddon><Icon name="banknote" /></InputGroupAddon>
  <InputGroupInput value="$form.price" />
  <InputGroupText i18n="..." />
  <InputGroupButton i18n="..." />
</InputGroup>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="checkbox" level="h2">
                Checkbox
            </Heading>
            <P>Boolean checkbox control. Use a state object with a value field for writable checked bindings.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>checked</Code>: optional controlled value or writable binding.
                    </Li>
                    <Li>
                        <Code>defaultChecked</Code>: optional initial checked value.
                    </Li>
                    <Li>
                        <Code>disabled</Code>: optional boolean.
                    </Li>
                    <Li>
                        <Code>id</Code>: optional control id.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<State id="accepted" value="false" />
<Checkbox id="accepted" checked="$accepted" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="switch" level="h2">
                Switch
            </Heading>
            <P>On/off switch control for settings. Writable checked bindings use a state object with a value field.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>checked</Code>: optional controlled value or writable binding.
                    </Li>
                    <Li>
                        <Code>defaultChecked</Code>: optional initial checked value.
                    </Li>
                    <Li>
                        <Code>disabled</Code>: optional boolean.
                    </Li>
                    <Li>
                        <Code>id</Code>: optional control id.
                    </Li>
                    <Li>
                        <Code>size</Code>: optional switch size. Defaults to <Code>default</Code>.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<State id="notifications" value="true" />
<Switch id="notifications" checked="$notifications" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="slider" level="h2">
                Slider
            </Heading>
            <P>Numeric range input. Writable value bindings use a state object with a value field.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: optional controlled value or writable binding.
                    </Li>
                    <Li>
                        <Code>defaultValue</Code>: optional initial value.
                    </Li>
                    <Li>
                        <Code>min</Code>: optional minimum. Defaults to <Code>0</Code>.
                    </Li>
                    <Li>
                        <Code>max</Code>: optional maximum. Defaults to <Code>100</Code>.
                    </Li>
                    <Li>
                        <Code>step</Code>: optional step. Defaults to <Code>1</Code>.
                    </Li>
                    <Li>
                        <Code>disabled</Code>, <Code>id</Code>, <Code>name</Code>, and <Code>orientation</Code>:
                        optional.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<State id="budget" value="50" />
<Slider min="0" max="100" step="5" value="$budget" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="toggle" level="h2">
                Toggle
            </Heading>
            <P>Single pressed/unpressed button. Writable pressed bindings use a state object with a value field.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        <Code>pressed</Code>: optional controlled value or writable binding.
                    </Li>
                    <Li>
                        <Code>defaultPressed</Code>: optional initial pressed value.
                    </Li>
                    <Li>
                        <Code>disabled</Code>: optional boolean.
                    </Li>
                    <Li>
                        <Code>id</Code>: optional control id.
                    </Li>
                    <Li>
                        <Code>size</Code> and <Code>variant</Code>: optional.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<State id="enabled" value="false" />
<Toggle pressed="$enabled" variant="outline" i18n="..." />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="togglegroup" level="h2">
                ToggleGroup
            </Heading>
            <P>Group of related ToggleGroupItem choices with single or multiple selection.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">ToggleGroup Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: optional controlled value.
                    </Li>
                    <Li>
                        <Code>defaultValue</Code>: optional initial value.
                    </Li>
                    <Li>
                        <Code>type</Code>: optional <Code>single</Code> or <Code>multiple</Code>. Defaults to{' '}
                        <Code>single</Code>.
                    </Li>
                    <Li>
                        <Code>disabled</Code>, <Code>loopFocus</Code>, <Code>orientation</Code>, <Code>size</Code>,{' '}
                        <Code>spacing</Code>, and <Code>variant</Code>: optional.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">ToggleGroupItem Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: required item value.
                    </Li>
                    <Li>
                        <Code>size</Code> and <Code>variant</Code>: optional overrides.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<ToggleGroup type="single" defaultValue="list">
  <ToggleGroupItem value="grid"><Icon name="layout-grid" /></ToggleGroupItem>
  <ToggleGroupItem value="list"><Icon name="list" /></ToggleGroupItem>
</ToggleGroup>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="radiogroup" level="h2">
                RadioGroup
            </Heading>
            <P>Mutually exclusive option group made from labeled RadioGroupItem choices.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">RadioGroup Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: optional controlled value.
                    </Li>
                    <Li>
                        <Code>defaultValue</Code>: optional initial value.
                    </Li>
                    <Li>
                        <Code>disabled</Code>, <Code>form</Code>, <Code>name</Code>, <Code>readOnly</Code>, and{' '}
                        <Code>required</Code>: optional.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">RadioGroupItem Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: required item value.
                    </Li>
                    <Li>
                        <Code>disabled</Code>, <Code>readOnly</Code>, and <Code>required</Code>: optional.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<RadioGroup name="priority" defaultValue="medium">
  <RadioGroupItem value="low" i18n="..." />
  <RadioGroupItem value="medium" i18n="..." />
</RadioGroup>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="select" level="h2">
                Select
            </Heading>
            <P>
                Dropdown select root with trigger, value, popup content, grouped options, labels, items, and separators.
                Writable value bindings use a state object with a value field.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Select Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: optional controlled value or writable binding.
                    </Li>
                    <Li>
                        <Code>defaultValue</Code>: optional initial selected value.
                    </Li>
                    <Li>
                        <Code>open</Code> and <Code>defaultOpen</Code>: optional.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">SelectValue Parameters</P>
                <Ul>
                    <Li>
                        <Code>placeholder</Code>: optional fallback text.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">SelectItem Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: required option value.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<State id="department" value="sales" />
<Select value="$department">
  <SelectTrigger><SelectValue i18n="..." /></SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel i18n="..." />
      <SelectItem value="sales" i18n="..." />
      <SelectSeparator />
      <SelectItem value="support" i18n="..." />
    </SelectGroup>
  </SelectContent>
</Select>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="text-elements" level="h2">
                Text Elements
            </Heading>
            <P>
                Use text nodes for structured copy, headings, inline markup, code formatting, links, and simple spacing.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">A Parameters</P>
                <Ul>
                    <Li>
                        <Code>to</Code>, <Code>href</Code>, and <Code>active</Code>: optional.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Pre Parameters</P>
                <Ul>
                    <Li>
                        <Code>lang</Code>: optional.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<H1 i18n="..." />
<H2 i18n="..." />
<H3 i18n="..." />
<H4 i18n="..." />
<P i18n="..." />
<A to="/issues/\${issue.id}" i18n="..." />
<B i18n="..." />
<U i18n="..." />
<S i18n="..." />
<Sup i18n="..." />
<Sub i18n="..." />
<Code i18n="..." />
<Pre lang="json" i18n="..." />
<Br />
<Hr />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="list" level="h2">
                List
            </Heading>
            <P>
                Ul and Ol render unordered or ordered list containers. Li renders one item inside either list.
            </P>
            <CodeBlock language="xml">{`<Ul>
  <Li i18n="..." />
  <Li i18n="..." />
</Ul>

<Ol>
  <Li i18n="..." />
  <Li i18n="..." />
</Ol>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="datatable" level="h2">
                DataTable
            </Heading>
            <P>
                Query-backed data table that renders array rows through the shared LongLink table shell. DataColumn
                defines aligned columns, while DataHeader and DataCell provide custom header and row content slots.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">DataTable Parameters</P>
                <Ul>
                    <Li>
                        <Code>data</Code>: required expression resolving to an array, usually a Query id such as{' '}
                        <Code>$orders</Code>.
                    </Li>
                    <Li>
                        <Code>as</Code>: optional row variable name exposed to DataCell children. Defaults to{' '}
                        <Code>row</Code>.
                    </Li>
                    <Li>
                        <Code>empty</Code>: optional empty-state message. Defaults to <Code>No results.</Code>
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">DataColumn Parameters</P>
                <Ul>
                    <Li>
                        <Code>field</Code>: optional dotted row field used for shorthand cells and column id.
                    </Li>
                    <Li>
                        <Code>header</Code>: optional shorthand header text.
                    </Li>
                    <Li>
                        <Code>id</Code>: optional stable column id.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">DataHeader Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: optional expression value.
                    </Li>
                </Ul>
            </Stack>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">DataCell Parameters</P>
                <Ul>
                    <Li>
                        <Code>value</Code>: optional expression value.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Query id="orders" path="/api/orders" />
<DataTable data="$orders" as="order" empty="No orders found.">
  <DataColumn field="number" i18n="..." />
  <DataColumn>
    <DataHeader>
      <Flex><P i18n="..." /><Badge i18n="..." /></Flex>
    </DataHeader>
    <DataCell>
      <Flex><P i18n="..." name="$order.customer.name" /><Badge value="$order.status" /></Flex>
    </DataCell>
  </DataColumn>
</DataTable>`}</CodeBlock>
        </Stack>
    </Stack>
);
