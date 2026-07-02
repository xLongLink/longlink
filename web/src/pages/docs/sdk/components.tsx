import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-02',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/components.tsx',
};

export const content = (
    <Stack>
        <Heading id="components" level="h1">
            Components
        </Heading>
        <P>
            Component elements cover actions, form controls, text, lists, tables, and small visual building blocks used
            inside SDK XML pages.
        </P>
        <Stack className="gap-3">
            <Heading id="action" level="h2">
                Action
            </Heading>
            <P>Wraps a clickable trigger such as Button or Icon and sends a mutation request when it is activated.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>action: optional request path or URL.</Li>
                    <Li>method: optional HTTP method. Defaults to POST.</Li>
                    <Li>json: optional expression payload sent as JSON.</Li>
                    <Li>invalidate: optional expression resolving to setup ids to refresh.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Action action="/api/orders/\${order.id}/complete" invalidate="\${['orders']}">
  <Button i18n="orders.complete" />
</Action>`}</CodeBlock>
        </Stack>
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
                    <Li>i18n: optional translation key for badge text.</Li>
                    <Li>value: optional expression value used as badge text when i18n is omitted.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Badge variant="outline" value="$order.status" />`}</CodeBlock>
        </Stack>
        <Stack>
            <Heading id="avatar-elements" level="h2">
                Avatar
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="avatar" level="h3">
                        Avatar
                    </Heading>
                    <P>Avatar shell for user or record imagery with image, fallback, and badge slots.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>size: optional avatar size. Defaults to default.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Avatar size="lg">
  <AvatarImage src="/avatars/sam.png" alt="Sam" />
  <AvatarFallback i18n="users.samInitials" />
  <AvatarBadge i18n="users.onlineCount" count="3" />
</Avatar>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="avatarimage" level="h3">
                        AvatarImage
                    </Heading>
                    <P>Image slot inside Avatar.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>src: optional image URL.</Li>
                            <Li>alt: optional accessible image label.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<AvatarImage src="/avatars/sam.png" alt="Sam" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="avatarfallback" level="h3">
                        AvatarFallback
                    </Heading>
                    <P>Fallback text shown when the avatar image is unavailable.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key for fallback text.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<AvatarFallback i18n="users.fallbackInitials" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="avatarbadge" level="h3">
                        AvatarBadge
                    </Heading>
                    <P>Small overlay badge for Avatar status or counts.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key for badge text.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<AvatarBadge i18n="users.online" />`}</CodeBlock>
                </Stack>
            </Stack>
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
                    <Li>i18n: optional translation key.</Li>
                    <Li>append and item: optional helper that appends an item into a target array state path.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Button variant="outline" disabled="form.saving" i18n="actions.saveDraft" />`}</CodeBlock>
        </Stack>
        <Stack>
            <Heading id="buttongroup-elements" level="h2">
                ButtonGroup
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="buttongroup" level="h3">
                        ButtonGroup
                    </Heading>
                    <P>Groups related buttons or inputs into one joined control.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>orientation: optional horizontal or vertical. Defaults to horizontal.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<ButtonGroup>
  <Button variant="outline" i18n="actions.back" />
  <Button i18n="actions.next" />
</ButtonGroup>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="buttongrouptext" level="h3">
                        ButtonGroupText
                    </Heading>
                    <P>Text segment inside ButtonGroup.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<ButtonGroupText i18n="pagination.page" page="1" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="buttongroupseparator" level="h3">
                        ButtonGroupSeparator
                    </Heading>
                    <P>Visual separator between ButtonGroup items.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>orientation: optional vertical or horizontal. Defaults to vertical.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<ButtonGroupSeparator />`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack>
            <Heading id="field-elements" level="h2">
                Field
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="field" level="h3">
                        Field
                    </Heading>
                    <P>Form field container that groups label, description, and control content.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>orientation: optional vertical or horizontal. Defaults to vertical.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Field>
  <FieldLabel htmlFor="email" i18n="users.email" />
  <FieldContent>
    <Input id="email" value="$form.email" />
  </FieldContent>
</Field>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="fieldlegend" level="h3">
                        FieldLegend
                    </Heading>
                    <P>Legend slot for grouped fields such as radio groups and toggle groups.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>variant: optional legend variant. Defaults to legend.</Li>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<FieldLegend>
  <FieldTitle i18n="orders.priority" />
  <FieldDescription i18n="orders.priorityHelp" />
</FieldLegend>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="fieldcontent" level="h3">
                        FieldContent
                    </Heading>
                    <P>Content slot that holds the interactive control or supporting text inside Field.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<FieldContent>
  <Input value="$form.name" />
</FieldContent>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="fieldlabel" level="h3">
                        FieldLabel
                    </Heading>
                    <P>Label slot for a Field.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>htmlFor: optional id of the associated control.</Li>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<FieldLabel htmlFor="name" i18n="users.name" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="fieldtitle" level="h3">
                        FieldTitle
                    </Heading>
                    <P>Primary title text inside FieldLabel or FieldLegend.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<FieldTitle i18n="orders.priority" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="fielddescription" level="h3">
                        FieldDescription
                    </Heading>
                    <P>Secondary helper text for a Field.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<FieldDescription i18n="orders.visibleToDispatchers" />`}</CodeBlock>
                </Stack>
            </Stack>
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
                    <Li>i18n: optional translation key.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Label htmlFor="search" i18n="actions.search" />`}</CodeBlock>
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
        <Stack>
            <Heading id="inputgroup-elements" level="h2">
                InputGroup
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="inputgroup" level="h3">
                        InputGroup
                    </Heading>
                    <P>Composes inputs with addons, inline text, and buttons.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<InputGroup>
  <InputGroupAddon><Icon name="badge-dollar-sign" /></InputGroupAddon>
  <InputGroupInput value="$form.price" />
  <InputGroupButton i18n="actions.apply" />
</InputGroup>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="inputgroupaddon" level="h3">
                        InputGroupAddon
                    </Heading>
                    <P>Addon slot inside InputGroup for icons or short prefixes and suffixes.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>align: optional inline-start or inline-end. Defaults to inline-start.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<InputGroupAddon align="inline-start">
  <Icon name="search" />
</InputGroupAddon>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="inputgroupbutton" level="h3">
                        InputGroupButton
                    </Heading>
                    <P>Button styled for use inside InputGroup.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>type: optional button type. Defaults to button.</Li>
                            <Li>size: optional size. Defaults to xs.</Li>
                            <Li>variant: optional variant. Defaults to ghost.</Li>
                            <Li>disabled: optional boolean.</Li>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<InputGroupButton variant="ghost" i18n="actions.search" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="inputgrouptext" level="h3">
                        InputGroupText
                    </Heading>
                    <P>Static text segment inside InputGroup.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<InputGroupText i18n="currency.usd" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="inputgroupinput" level="h3">
                        InputGroupInput
                    </Heading>
                    <P>Input element styled for use inside InputGroup.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>
                                id, label, placeholder, value, type, disabled, autoComplete, and aria-invalid match
                                Input.
                            </Li>
                            <Li>i18n: optional translation key used as placeholder text.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<InputGroupInput i18n="orders.searchPlaceholder" value="$filters.query" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="inputgrouptextarea" level="h3">
                        InputGroupTextarea
                    </Heading>
                    <P>Textarea element styled for use inside InputGroup.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>id, label, placeholder, value, disabled, cols, and rows match Textarea.</Li>
                            <Li>i18n: optional translation key used as placeholder text.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<InputGroupTextarea rows="3" value="$form.message" />`}</CodeBlock>
                </Stack>
            </Stack>
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
<Toggle pressed="$enabled" variant="outline" i18n="settings.enabled" />`}</CodeBlock>
        </Stack>
        <Stack>
            <Heading id="togglegroup-elements" level="h2">
                ToggleGroup
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="togglegroup" level="h3">
                        ToggleGroup
                    </Heading>
                    <P>Group of related toggle choices with single or multiple selection.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>value: optional controlled value.</Li>
                            <Li>defaultValue: optional initial value.</Li>
                            <Li>type: optional single or multiple. Defaults to single.</Li>
                            <Li>disabled, loopFocus, orientation, size, spacing, and variant are optional.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<ToggleGroup type="single" defaultValue="center">
  <ToggleGroupItem value="left"><Icon name="align-left" /></ToggleGroupItem>
  <ToggleGroupItem value="center"><Icon name="align-center" /></ToggleGroupItem>
</ToggleGroup>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="togglegroupitem" level="h3">
                        ToggleGroupItem
                    </Heading>
                    <P>Selectable item inside ToggleGroup.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>value: required item value.</Li>
                            <Li>size and variant are optional overrides.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<ToggleGroupItem value="right"><Icon name="align-right" /></ToggleGroupItem>`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack>
            <Heading id="radiogroup-elements" level="h2">
                RadioGroup
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="radiogroup" level="h3">
                        RadioGroup
                    </Heading>
                    <P>Mutually exclusive option group.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>value: optional controlled value.</Li>
                            <Li>defaultValue: optional initial value.</Li>
                            <Li>disabled, form, name, readOnly, and required are optional.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<RadioGroup name="priority" defaultValue="medium">
  <RadioGroupItem value="low" i18n="orders.priority.low" />
  <RadioGroupItem value="medium" i18n="orders.priority.medium" />
</RadioGroup>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="radiogroupitem" level="h3">
                        RadioGroupItem
                    </Heading>
                    <P>Labeled option inside RadioGroup.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>value: required item value.</Li>
                            <Li>disabled, readOnly, and required are optional.</Li>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<RadioGroupItem value="high" i18n="orders.priority.high" />`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack>
            <Heading id="select-elements" level="h2">
                Select
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="select" level="h3">
                        Select
                    </Heading>
                    <P>Dropdown select root. Writable value bindings use a state object with a value field.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>value: optional controlled value or writable binding.</Li>
                            <Li>defaultValue: optional initial selected value.</Li>
                            <Li>open and defaultOpen are optional.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<State id="department" value="sales" />
<Select value="$department">
  <SelectTrigger><SelectValue i18n="departments.placeholder" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="sales" i18n="departments.sales" />
  </SelectContent>
</Select>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="selecttrigger" level="h3">
                        SelectTrigger
                    </Heading>
                    <P>Clickable trigger slot for Select.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<SelectTrigger>
  <SelectValue i18n="orders.chooseStatus" />
</SelectTrigger>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="selectvalue" level="h3">
                        SelectValue
                    </Heading>
                    <P>Displays selected value or placeholder text inside SelectTrigger.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>placeholder: optional fallback text.</Li>
                            <Li>i18n: optional translation key used as placeholder.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<SelectValue i18n="orders.chooseStatus" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="selectcontent" level="h3">
                        SelectContent
                    </Heading>
                    <P>Popup content slot for Select options.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<SelectContent>
  <SelectItem value="open" i18n="orders.open" />
</SelectContent>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="selectgroup" level="h3">
                        SelectGroup
                    </Heading>
                    <P>Groups related SelectItem options.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<SelectGroup>
  <SelectLabel i18n="orders.status" />
  <SelectItem value="open" i18n="orders.open" />
</SelectGroup>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="selectlabel" level="h3">
                        SelectLabel
                    </Heading>
                    <P>Non-selectable label inside SelectContent or SelectGroup.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<SelectLabel i18n="orders.status" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="selectitem" level="h3">
                        SelectItem
                    </Heading>
                    <P>Selectable option inside SelectContent.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>value: required option value.</Li>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<SelectItem value="closed" i18n="orders.closed" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="selectseparator" level="h3">
                        SelectSeparator
                    </Heading>
                    <P>Visual separator between Select groups.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<SelectSeparator />`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack>
            <Heading id="headings-elements" level="h2">
                Headings
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="h1" level="h3">
                        H1
                    </Heading>
                    <P>Top-level page heading.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<H1 i18n="orders.title" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="h2" level="h3">
                        H2
                    </Heading>
                    <P>Second-level section heading.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<H2 i18n="orders.openWork" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="h3" level="h3">
                        H3
                    </Heading>
                    <P>Third-level subsection heading.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<H3 i18n="warehouse.title" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="h4" level="h3">
                        H4
                    </Heading>
                    <P>Fourth-level minor heading.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<H4 i18n="orders.notes" />`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack className="gap-3">
            <Heading id="p" level="h2">
                P
            </Heading>
            <P>Paragraph text block.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>i18n: optional translation key.</Li>
                    <Li>value: optional expression value used as text when i18n is omitted.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<P value="$order.customer.name" />`}</CodeBlock>
        </Stack>
        <Stack>
            <Heading id="text-elements" level="h2">
                Text
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="a" level="h3">
                        A
                    </Heading>
                    <P>Styled link to another page or external resource.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>href: optional destination URL.</Li>
                            <Li>active: optional always value for active styling.</Li>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<A href="/settings" i18n="settings.open" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="b" level="h3">
                        B
                    </Heading>
                    <P>Inline bold text.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<B i18n="labels.important" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="u" level="h3">
                        U
                    </Heading>
                    <P>Inline underlined text.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<U i18n="labels.underlined" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="s" level="h3">
                        S
                    </Heading>
                    <P>Inline struck-through text for obsolete or removed values.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<S i18n="labels.deprecated" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="sup" level="h3">
                        Sup
                    </Heading>
                    <P>Inline superscript text.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Sup i18n="units.squareMetersSuffix" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="sub" level="h3">
                        Sub
                    </Heading>
                    <P>Inline subscript text.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Sub i18n="units.waterSuffix" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="code" level="h3">
                        Code
                    </Heading>
                    <P>Inline monospace code text.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Code i18n="examples.orderStatusPath" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="pre" level="h3">
                        Pre
                    </Heading>
                    <P>Preformatted code block. Content is translation-backed when i18n is provided.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>lang: optional language label. Defaults to text.</Li>
                            <Li>i18n: optional translation key for block content.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Pre lang="json" i18n="examples.orderJson" />`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack>
            <Heading id="spacing-elements" level="h2">
                Spacing
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="br" level="h3">
                        Br
                    </Heading>
                    <P>Vertical spacer block.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Br />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="hr" level="h3">
                        Hr
                    </Heading>
                    <P>Horizontal separator line.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Hr />`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack>
            <Heading id="list-elements" level="h2">
                List
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="ul" level="h3">
                        Ul
                    </Heading>
                    <P>Unordered list container.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Ul>
  <Li i18n="orders.steps.pack" />
  <Li i18n="orders.steps.printLabel" />
</Ul>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="ol" level="h3">
                        Ol
                    </Heading>
                    <P>Ordered list container.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Ol>
  <Li i18n="orders.steps.validate" />
  <Li i18n="orders.steps.submit" />
</Ol>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="li" level="h3">
                        Li
                    </Heading>
                    <P>List item for Ul or Ol.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Li i18n="orders.steps.validate" />`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack>
            <Heading id="table-elements" level="h2">
                Table
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="datatable" level="h3">
                        DataTable
                    </Heading>
                    <P>
                        Query-backed data table that renders array rows through the shared LongLink table shell. Use
                        DataColumn children for aligned columns.
                    </P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>
                                data: required expression resolving to an array, usually a Query id such as $orders.
                            </Li>
                            <Li>as: optional row variable name exposed to DataCell children. Defaults to row.</Li>
                            <Li>empty: optional empty-state message. Defaults to No results.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Query id="orders" path="/api/orders" />
<DataTable data="$orders" as="order" empty="No orders found.">
  <DataColumn field="number" header="Order" />
  <DataColumn>
    <DataHeader>
      <Flex><P i18n="orders.columns.customer" /><Badge i18n="orders.columns.primary" /></Flex>
    </DataHeader>
    <DataCell>
      <Flex><P value="$order.customer.name" /><Badge value="$order.status" /></Flex>
    </DataCell>
  </DataColumn>
</DataTable>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="datacolumn" level="h3">
                        DataColumn
                    </Heading>
                    <P>Column definition consumed by DataTable.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>field: optional dotted row field used for shorthand cells and column id.</Li>
                            <Li>header: optional shorthand header text.</Li>
                            <Li>i18n: optional shorthand translation key for the header.</Li>
                            <Li>id: optional stable column id.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<DataColumn field="created_by.name" header="Created by" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="dataheader" level="h3">
                        DataHeader
                    </Heading>
                    <P>Custom header slot for one DataColumn. Children can use normal XML layout components.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                            <Li>value: optional expression value.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<DataHeader>
  <Flex><P i18n="orders.columns.status" /><Badge i18n="orders.live" /></Flex>
</DataHeader>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="datacell" level="h3">
                        DataCell
                    </Heading>
                    <P>
                        Custom row cell slot for one DataColumn. Children can read the scoped row variable from
                        DataTable as.
                    </P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                            <Li>value: optional expression value.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<DataCell>
  <Flex><P value="$order.number" /><Badge value="$order.status" /></Flex>
</DataCell>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="table" level="h3">
                        Table
                    </Heading>
                    <P>Table shell for structured rows and columns.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Table>
  <Thead><Tr><Th i18n="orders.columns.order" /><Th i18n="orders.columns.status" /></Tr></Thead>
  <Tbody><Tr><Td i18n="orders.number" number="order.number" /><Td i18n="orders.open" /></Tr></Tbody>
</Table>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="thead" level="h3">
                        Thead
                    </Heading>
                    <P>Table header section.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Thead>
  <Tr><Th i18n="orders.columns.name" /><Th i18n="orders.columns.status" /></Tr>
</Thead>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="tbody" level="h3">
                        Tbody
                    </Heading>
                    <P>Table body section.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Tbody>
  <Tr><Td i18n="orders.alpha" /><Td i18n="orders.open" /></Tr>
</Tbody>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="tfoot" level="h3">
                        Tfoot
                    </Heading>
                    <P>Table footer section.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Tfoot>
  <Tr><Td i18n="orders.total" /><Td i18n="orders.count" count="12" /></Tr>
</Tfoot>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="tr" level="h3">
                        Tr
                    </Heading>
                    <P>Table row.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Tr>
  <Td i18n="orders.number" number="order.number" />
  <Td i18n="orders.open" />
</Tr>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="th" level="h3">
                        Th
                    </Heading>
                    <P>Table header cell.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                            <Li>value: optional expression value used when i18n is omitted.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Th value="$column.label" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="td" level="h3">
                        Td
                    </Heading>
                    <P>Table data cell.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key.</Li>
                            <Li>value: optional expression value used when i18n is omitted.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Td value="$order.status" />`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
    </Stack>
);
