import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/components.tsx',
};

export const content = (
    <Stack>
        <Heading id="components" level="h1">
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
                    <Li>name: required Lucide icon name, usually kebab-case.</Li>
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
                    <Li>variant: optional default, outline, ghost, destructive, or link.</Li>
                    <Li>value: optional expression value used as badge text when translation is omitted.</Li>
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
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>Avatar size: optional avatar size. Defaults to default.</Li>
                    <Li>AvatarImage src: optional image URL.</Li>
                    <Li>AvatarImage alt: optional accessible image label.</Li>
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
                    <Li>variant: optional default, outline, ghost, destructive, or link.</Li>
                    <Li>size: optional button size.</Li>
                    <Li>submit: optional boolean. When true, renders type submit.</Li>
                    <Li>disabled: optional boolean expression.</Li>
                    <Li>append and item: optional helper that appends an item into a target array state path.</Li>
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
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>ButtonGroup orientation: optional horizontal or vertical. Defaults to horizontal.</Li>
                    <Li>ButtonGroupSeparator orientation: optional vertical or horizontal. Defaults to vertical.</Li>
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
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>Field orientation: optional vertical or horizontal. Defaults to vertical.</Li>
                    <Li>FieldLegend variant: optional legend variant. Defaults to legend.</Li>
                    <Li>FieldContent: no parameters.</Li>
                    <Li>FieldLabel htmlFor: optional id of the associated control.</Li>
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
                    <Li>htmlFor: optional id of the associated control.</Li>
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
                    <Li>id: optional control id.</Li>
                    <Li>label: optional accessible label.</Li>
                    <Li>placeholder: optional placeholder text.</Li>
                    <Li>value: optional value or writable binding.</Li>
                    <Li>type: optional input type.</Li>
                    <Li>disabled: optional boolean.</Li>
                    <Li>autoComplete: optional browser autocomplete value.</Li>
                    <Li>aria-invalid: optional invalid state.</Li>
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
                    <Li>id: optional control id.</Li>
                    <Li>label: optional accessible label.</Li>
                    <Li>placeholder: optional placeholder text.</Li>
                    <Li>value: optional value or writable binding.</Li>
                    <Li>disabled: optional boolean.</Li>
                    <Li>cols and rows: optional numeric dimensions.</Li>
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
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>InputGroup: no parameters.</Li>
                    <Li>InputGroupAddon align: optional inline-start or inline-end. Defaults to inline-start.</Li>
                    <Li>InputGroupButton type: optional button type. Defaults to button.</Li>
                    <Li>InputGroupButton size: optional size. Defaults to xs.</Li>
                    <Li>InputGroupButton variant: optional variant. Defaults to ghost.</Li>
                    <Li>InputGroupButton disabled: optional boolean.</Li>
                    <Li>
                        InputGroupInput: id, label, placeholder, value, type, disabled, autoComplete, and aria-invalid
                        match Input.
                    </Li>
                    <Li>InputGroupTextarea: id, label, placeholder, value, disabled, cols, and rows match Textarea.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<InputGroup>
  <InputGroupAddon><Icon name="badge-dollar-sign" /></InputGroupAddon>
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
                    <Li>checked: optional controlled value or writable binding.</Li>
                    <Li>defaultChecked: optional initial checked value.</Li>
                    <Li>disabled: optional boolean.</Li>
                    <Li>id: optional control id.</Li>
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
                    <Li>checked: optional controlled value or writable binding.</Li>
                    <Li>defaultChecked: optional initial checked value.</Li>
                    <Li>disabled: optional boolean.</Li>
                    <Li>id: optional control id.</Li>
                    <Li>size: optional switch size. Defaults to default.</Li>
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
                    <Li>value: optional controlled value or writable binding.</Li>
                    <Li>defaultValue: optional initial value.</Li>
                    <Li>min: optional minimum. Defaults to 0.</Li>
                    <Li>max: optional maximum. Defaults to 100.</Li>
                    <Li>step: optional step. Defaults to 1.</Li>
                    <Li>disabled, id, name, and orientation are optional.</Li>
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
                    <Li>pressed: optional controlled value or writable binding.</Li>
                    <Li>defaultPressed: optional initial pressed value.</Li>
                    <Li>disabled: optional boolean.</Li>
                    <Li>id: optional control id.</Li>
                    <Li>size and variant are optional.</Li>
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
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>ToggleGroup value: optional controlled value.</Li>
                    <Li>ToggleGroup defaultValue: optional initial value.</Li>
                    <Li>ToggleGroup type: optional single or multiple. Defaults to single.</Li>
                    <Li>ToggleGroup disabled, loopFocus, orientation, size, spacing, and variant are optional.</Li>
                    <Li>ToggleGroupItem value: required item value.</Li>
                    <Li>ToggleGroupItem size and variant are optional overrides.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<ToggleGroup type="single" defaultValue="center">
  <ToggleGroupItem value="left"><Icon name="align-left" /></ToggleGroupItem>
  <ToggleGroupItem value="center"><Icon name="align-center" /></ToggleGroupItem>
</ToggleGroup>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="radiogroup" level="h2">
                RadioGroup
            </Heading>
            <P>Mutually exclusive option group made from labeled RadioGroupItem choices.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>RadioGroup value: optional controlled value.</Li>
                    <Li>RadioGroup defaultValue: optional initial value.</Li>
                    <Li>RadioGroup disabled, form, name, readOnly, and required are optional.</Li>
                    <Li>RadioGroupItem value: required item value.</Li>
                    <Li>RadioGroupItem disabled, readOnly, and required are optional.</Li>
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
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>Select value: optional controlled value or writable binding.</Li>
                    <Li>Select defaultValue: optional initial selected value.</Li>
                    <Li>Select open and defaultOpen are optional.</Li>
                    <Li>SelectTrigger, SelectContent, SelectGroup, and SelectSeparator: no parameters.</Li>
                    <Li>SelectValue placeholder: optional fallback text.</Li>
                    <Li>SelectItem value: required option value.</Li>
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
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>H1, H2, H3, H4, and P: optional value fallback.</Li>
                    <Li>A: optional to, href, and active.</Li>
                    <Li>B, U, S, Sup, Sub, and Code: no component-specific parameters.</Li>
                    <Li>Pre: optional lang.</Li>
                    <Li>Br and Hr have no parameters.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<H1 i18n="..." />
<H2 i18n="..." />
<H3 value="$warehouse.name" />
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
                Ul and Ol render unordered or ordered list containers. Li renders one translated item inside either list.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>Ul and Ol: no parameters.</Li>
                    <Li>Li: no component-specific parameters.</Li>
                </Ul>
            </Stack>
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
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>
                        DataTable data: required expression resolving to an array, usually a Query id such as $orders.
                    </Li>
                    <Li>DataTable as: optional row variable name exposed to DataCell children. Defaults to row.</Li>
                    <Li>DataTable empty: optional empty-state message. Defaults to No results.</Li>
                    <Li>DataColumn field: optional dotted row field used for shorthand cells and column id.</Li>
                    <Li>DataColumn header: optional shorthand header text.</Li>
                    <Li>DataColumn id: optional stable column id.</Li>
                    <Li>DataHeader value: optional expression value.</Li>
                    <Li>DataCell value: optional expression value.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Query id="orders" path="/api/orders" />
<DataTable data="$orders" as="order" empty="No orders found.">
  <DataColumn field="number" header="Order" />
  <DataColumn>
    <DataHeader>
      <Flex><P i18n="..." /><Badge i18n="..." /></Flex>
    </DataHeader>
    <DataCell>
      <Flex><P value="$order.customer.name" /><Badge value="$order.status" /></Flex>
    </DataCell>
  </DataColumn>
</DataTable>`}</CodeBlock>
        </Stack>
    </Stack>
);
