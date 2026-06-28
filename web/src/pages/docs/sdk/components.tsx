import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';

type ElementDoc = {
    name: string;
    id: string;
    description: string;
    parameters: string[];
    example: string;
};

const componentDocs: ElementDoc[] = [
    {
        name: 'Action',
        id: 'action',
        description:
            'Renders an action button that can send a mutation request and refresh State or Query declarations after success.',
        parameters: [
            'action: optional request path or URL.',
            'method: optional HTTP method. Defaults to POST.',
            'json: optional expression payload sent as JSON.',
            'invalidate: optional expression resolving to setup ids to refresh.',
        ],
        example: `<Action action="/api/orders/${'${order.id}'}/complete" invalidate="['orders']">
  Complete
</Action>`,
    },
    {
        name: 'Icon',
        id: 'icon',
        description: 'Renders a Lucide icon by XML name. Blank or missing names fail fast.',
        parameters: ['name: required Lucide icon name, usually kebab-case.'],
        example: `<Icon name="settings" />`,
    },
    {
        name: 'Badge',
        id: 'badge',
        description: 'Displays compact status, category, or count text.',
        parameters: [
            'variant: optional default, outline, ghost, destructive, or link.',
            'i18n: optional translation key for badge text.',
        ],
        example: `<Badge variant="outline">Pending review</Badge>`,
    },
    {
        name: 'Avatar',
        id: 'avatar',
        description: 'Avatar shell for user or record imagery with image, fallback, and badge slots.',
        parameters: ['size: optional avatar size. Defaults to default.'],
        example: `<Avatar size="lg">
  <AvatarImage src="/avatars/sam.png" alt="Sam" />
  <AvatarFallback>SA</AvatarFallback>
  <AvatarBadge>3</AvatarBadge>
</Avatar>`,
    },
    {
        name: 'AvatarImage',
        id: 'avatarimage',
        description: 'Image slot inside Avatar.',
        parameters: ['src: optional image URL.', 'alt: optional accessible image label.'],
        example: `<AvatarImage src="/avatars/sam.png" alt="Sam" />`,
    },
    {
        name: 'AvatarFallback',
        id: 'avatarfallback',
        description: 'Fallback text shown when the avatar image is unavailable.',
        parameters: ['i18n: optional translation key for fallback text.'],
        example: `<AvatarFallback>LL</AvatarFallback>`,
    },
    {
        name: 'AvatarBadge',
        id: 'avatarbadge',
        description: 'Small overlay badge for Avatar status or counts.',
        parameters: ['i18n: optional translation key for badge text.'],
        example: `<AvatarBadge i18n="users.online" />`,
    },
    {
        name: 'Button',
        id: 'button',
        description: 'Standard clickable button for local actions, form submission, or list append helpers.',
        parameters: [
            'variant: optional default, outline, ghost, destructive, or link.',
            'size: optional button size.',
            'submit: optional boolean. When true, renders type submit.',
            'disabled: optional boolean expression.',
            'i18n: optional translation key.',
            'append and item: optional helper that appends an item into a target array state path.',
        ],
        example: `<Button variant="outline" disabled="form.saving">
  Save draft
</Button>`,
    },
    {
        name: 'ButtonGroup',
        id: 'buttongroup',
        description: 'Groups related buttons or inputs into one joined control.',
        parameters: ['orientation: optional horizontal or vertical. Defaults to horizontal.'],
        example: `<ButtonGroup>
  <Button variant="outline">Back</Button>
  <Button>Next</Button>
</ButtonGroup>`,
    },
    {
        name: 'ButtonGroupText',
        id: 'buttongrouptext',
        description: 'Text segment inside ButtonGroup.',
        parameters: ['i18n: optional translation key.'],
        example: `<ButtonGroupText>Page 1</ButtonGroupText>`,
    },
    {
        name: 'ButtonGroupSeparator',
        id: 'buttongroupseparator',
        description: 'Visual separator between ButtonGroup items.',
        parameters: ['orientation: optional vertical or horizontal. Defaults to vertical.'],
        example: `<ButtonGroupSeparator />`,
    },
    {
        name: 'Field',
        id: 'field',
        description: 'Form field container that groups label, description, and control content.',
        parameters: ['orientation: optional vertical or horizontal. Defaults to vertical.'],
        example: `<Field>
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <FieldContent>
    <Input id="email" value="$form.email" />
  </FieldContent>
</Field>`,
    },
    {
        name: 'FieldLegend',
        id: 'fieldlegend',
        description: 'Legend slot for grouped fields such as radio groups and toggle groups.',
        parameters: ['variant: optional legend variant. Defaults to legend.', 'i18n: optional translation key.'],
        example: `<FieldLegend>
  <FieldTitle>Priority</FieldTitle>
  <FieldDescription>Choose how urgent this is.</FieldDescription>
</FieldLegend>`,
    },
    {
        name: 'FieldContent',
        id: 'fieldcontent',
        description: 'Content slot that holds the interactive control or supporting text inside Field.',
        parameters: ['No parameters.'],
        example: `<FieldContent>
  <Input value="$form.name" />
</FieldContent>`,
    },
    {
        name: 'FieldLabel',
        id: 'fieldlabel',
        description: 'Label slot for a Field.',
        parameters: ['htmlFor: optional id of the associated control.', 'i18n: optional translation key.'],
        example: `<FieldLabel htmlFor="name">Name</FieldLabel>`,
    },
    {
        name: 'FieldTitle',
        id: 'fieldtitle',
        description: 'Primary title text inside FieldLabel or FieldLegend.',
        parameters: ['i18n: optional translation key.'],
        example: `<FieldTitle i18n="orders.priority" />`,
    },
    {
        name: 'FieldDescription',
        id: 'fielddescription',
        description: 'Secondary helper text for a Field.',
        parameters: ['i18n: optional translation key.'],
        example: `<FieldDescription>Visible to dispatchers.</FieldDescription>`,
    },
    {
        name: 'Label',
        id: 'label',
        description: 'Standalone form label when a full Field wrapper is unnecessary.',
        parameters: ['htmlFor: optional id of the associated control.', 'i18n: optional translation key.'],
        example: `<Label htmlFor="search">Search</Label>`,
    },
    {
        name: 'Input',
        id: 'input',
        description: 'Single-line text or number input. Writable value bindings update state as the user types.',
        parameters: [
            'id: optional control id.',
            'label: optional accessible label.',
            'placeholder: optional placeholder text.',
            'value: optional value or writable binding.',
            'type: optional input type.',
            'disabled: optional boolean.',
            'autoComplete: optional browser autocomplete value.',
            'aria-invalid: optional invalid state.',
        ],
        example: `<Input id="quantity" type="number" value="$form.quantity" />`,
    },
    {
        name: 'Textarea',
        id: 'textarea',
        description: 'Multi-line text input. Writable value bindings update state as the user types.',
        parameters: [
            'id: optional control id.',
            'label: optional accessible label.',
            'placeholder: optional placeholder text.',
            'value: optional value or writable binding.',
            'disabled: optional boolean.',
            'cols and rows: optional numeric dimensions.',
        ],
        example: `<Textarea id="notes" rows="4" value="$form.notes" />`,
    },
    {
        name: 'InputGroup',
        id: 'inputgroup',
        description: 'Composes inputs with addons, inline text, and buttons.',
        parameters: ['No parameters.'],
        example: `<InputGroup>
  <InputGroupAddon>$</InputGroupAddon>
  <InputGroupInput value="$form.price" />
  <InputGroupButton>Apply</InputGroupButton>
</InputGroup>`,
    },
    {
        name: 'InputGroupAddon',
        id: 'inputgroupaddon',
        description: 'Addon slot inside InputGroup for icons or short prefixes and suffixes.',
        parameters: ['align: optional inline-start or inline-end. Defaults to inline-start.'],
        example: `<InputGroupAddon align="inline-start">
  <Icon name="search" />
</InputGroupAddon>`,
    },
    {
        name: 'InputGroupButton',
        id: 'inputgroupbutton',
        description: 'Button styled for use inside InputGroup.',
        parameters: [
            'type: optional button type. Defaults to button.',
            'size: optional size. Defaults to xs.',
            'variant: optional variant. Defaults to ghost.',
            'disabled: optional boolean.',
            'i18n: optional translation key.',
        ],
        example: `<InputGroupButton variant="ghost">Search</InputGroupButton>`,
    },
    {
        name: 'InputGroupText',
        id: 'inputgrouptext',
        description: 'Static text segment inside InputGroup.',
        parameters: ['i18n: optional translation key.'],
        example: `<InputGroupText>USD</InputGroupText>`,
    },
    {
        name: 'InputGroupInput',
        id: 'inputgroupinput',
        description: 'Input element styled for use inside InputGroup.',
        parameters: [
            'id, label, placeholder, value, type, disabled, autoComplete, and aria-invalid match Input.',
            'i18n: optional translation key used as placeholder text.',
        ],
        example: `<InputGroupInput placeholder="Search orders" value="$filters.query" />`,
    },
    {
        name: 'InputGroupTextarea',
        id: 'inputgrouptextarea',
        description: 'Textarea element styled for use inside InputGroup.',
        parameters: [
            'id, label, placeholder, value, disabled, cols, and rows match Textarea.',
            'i18n: optional translation key used as placeholder text.',
        ],
        example: `<InputGroupTextarea rows="3" value="$form.message" />`,
    },
    {
        name: 'Checkbox',
        id: 'checkbox',
        description: 'Boolean checkbox control. Use a state object with a value field for writable checked bindings.',
        parameters: [
            'checked: optional controlled value or writable binding.',
            'defaultChecked: optional initial checked value.',
            'disabled: optional boolean.',
            'id: optional control id.',
        ],
        example: `<State id="accepted" value="false" />
<Checkbox id="accepted" checked="$accepted" />`,
    },
    {
        name: 'Switch',
        id: 'switch',
        description:
            'On/off switch control for settings. Writable checked bindings use a state object with a value field.',
        parameters: [
            'checked: optional controlled value or writable binding.',
            'defaultChecked: optional initial checked value.',
            'disabled: optional boolean.',
            'id: optional control id.',
            'size: optional switch size. Defaults to default.',
        ],
        example: `<State id="notifications" value="true" />
<Switch id="notifications" checked="$notifications" />`,
    },
    {
        name: 'Slider',
        id: 'slider',
        description: 'Numeric range input. Writable value bindings use a state object with a value field.',
        parameters: [
            'value: optional controlled value or writable binding.',
            'defaultValue: optional initial value.',
            'min: optional minimum. Defaults to 0.',
            'max: optional maximum. Defaults to 100.',
            'step: optional step. Defaults to 1.',
            'disabled, id, name, and orientation are optional.',
        ],
        example: `<State id="budget" value="50" />
<Slider min="0" max="100" step="5" value="$budget" />`,
    },
    {
        name: 'Toggle',
        id: 'toggle',
        description:
            'Single pressed/unpressed button. Writable pressed bindings use a state object with a value field.',
        parameters: [
            'pressed: optional controlled value or writable binding.',
            'defaultPressed: optional initial pressed value.',
            'disabled: optional boolean.',
            'id: optional control id.',
            'size and variant are optional.',
        ],
        example: `<State id="enabled" value="false" />
<Toggle pressed="$enabled" variant="outline">Enabled</Toggle>`,
    },
    {
        name: 'ToggleGroup',
        id: 'togglegroup',
        description: 'Group of related toggle choices with single or multiple selection.',
        parameters: [
            'value: optional controlled value.',
            'defaultValue: optional initial value.',
            'type: optional single or multiple. Defaults to single.',
            'disabled, loopFocus, orientation, size, spacing, and variant are optional.',
        ],
        example: `<ToggleGroup type="single" defaultValue="center">
  <ToggleGroupItem value="left">Left</ToggleGroupItem>
  <ToggleGroupItem value="center">Center</ToggleGroupItem>
</ToggleGroup>`,
    },
    {
        name: 'ToggleGroupItem',
        id: 'togglegroupitem',
        description: 'Selectable item inside ToggleGroup.',
        parameters: ['value: required item value.', 'size and variant are optional overrides.'],
        example: `<ToggleGroupItem value="right">Right</ToggleGroupItem>`,
    },
    {
        name: 'RadioGroup',
        id: 'radiogroup',
        description: 'Mutually exclusive option group.',
        parameters: [
            'value: optional controlled value.',
            'defaultValue: optional initial value.',
            'disabled, form, name, readOnly, and required are optional.',
        ],
        example: `<RadioGroup name="priority" defaultValue="medium">
  <RadioGroupItem value="low">Low</RadioGroupItem>
  <RadioGroupItem value="medium">Medium</RadioGroupItem>
</RadioGroup>`,
    },
    {
        name: 'RadioGroupItem',
        id: 'radiogroupitem',
        description: 'Labeled option inside RadioGroup.',
        parameters: [
            'value: required item value.',
            'disabled, readOnly, and required are optional.',
            'i18n: optional translation key.',
        ],
        example: `<RadioGroupItem value="high" i18n="orders.priority.high" />`,
    },
    {
        name: 'Select',
        id: 'select',
        description: 'Dropdown select root. Writable value bindings use a state object with a value field.',
        parameters: [
            'value: optional controlled value or writable binding.',
            'defaultValue: optional initial selected value.',
            'open and defaultOpen are optional.',
        ],
        example: `<State id="department" value="sales" />
<Select value="$department">
  <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="sales">Sales</SelectItem>
  </SelectContent>
</Select>`,
    },
    {
        name: 'SelectTrigger',
        id: 'selecttrigger',
        description: 'Clickable trigger slot for Select.',
        parameters: ['No parameters.'],
        example: `<SelectTrigger>
  <SelectValue placeholder="Choose status" />
</SelectTrigger>`,
    },
    {
        name: 'SelectValue',
        id: 'selectvalue',
        description: 'Displays selected value or placeholder text inside SelectTrigger.',
        parameters: ['placeholder: optional fallback text.', 'i18n: optional translation key used as placeholder.'],
        example: `<SelectValue placeholder="Choose status" />`,
    },
    {
        name: 'SelectContent',
        id: 'selectcontent',
        description: 'Popup content slot for Select options.',
        parameters: ['No parameters.'],
        example: `<SelectContent>
  <SelectItem value="open">Open</SelectItem>
</SelectContent>`,
    },
    {
        name: 'SelectGroup',
        id: 'selectgroup',
        description: 'Groups related SelectItem options.',
        parameters: ['No parameters.'],
        example: `<SelectGroup>
  <SelectLabel>Status</SelectLabel>
  <SelectItem value="open">Open</SelectItem>
</SelectGroup>`,
    },
    {
        name: 'SelectLabel',
        id: 'selectlabel',
        description: 'Non-selectable label inside SelectContent or SelectGroup.',
        parameters: ['i18n: optional translation key.'],
        example: `<SelectLabel i18n="orders.status" />`,
    },
    {
        name: 'SelectItem',
        id: 'selectitem',
        description: 'Selectable option inside SelectContent.',
        parameters: ['value: required option value.', 'i18n: optional translation key.'],
        example: `<SelectItem value="closed">Closed</SelectItem>`,
    },
    {
        name: 'SelectSeparator',
        id: 'selectseparator',
        description: 'Visual separator between Select groups.',
        parameters: ['No parameters.'],
        example: `<SelectSeparator />`,
    },
    {
        name: 'H1',
        id: 'h1',
        description: 'Top-level page heading.',
        parameters: ['i18n: optional translation key.'],
        example: `<H1>Orders</H1>`,
    },
    {
        name: 'H2',
        id: 'h2',
        description: 'Second-level section heading.',
        parameters: ['i18n: optional translation key.'],
        example: `<H2>Open work</H2>`,
    },
    {
        name: 'H3',
        id: 'h3',
        description: 'Third-level subsection heading.',
        parameters: ['i18n: optional translation key.'],
        example: `<H3>Warehouse</H3>`,
    },
    {
        name: 'H4',
        id: 'h4',
        description: 'Fourth-level minor heading.',
        parameters: ['i18n: optional translation key.'],
        example: `<H4>Notes</H4>`,
    },
    {
        name: 'P',
        id: 'p',
        description: 'Paragraph text block.',
        parameters: ['i18n: optional translation key.'],
        example: `<P>Use this page to manage incoming work.</P>`,
    },
    {
        name: 'A',
        id: 'a',
        description: 'Styled link to another page or external resource.',
        parameters: [
            'href: optional destination URL.',
            'active: optional always value for active styling.',
            'i18n: optional translation key.',
        ],
        example: `<A href="/settings">Open settings</A>`,
    },
    {
        name: 'B',
        id: 'b',
        description: 'Inline bold text.',
        parameters: ['i18n: optional translation key.'],
        example: `<B>Important</B>`,
    },
    {
        name: 'U',
        id: 'u',
        description: 'Inline underlined text.',
        parameters: ['i18n: optional translation key.'],
        example: `<U>Underlined</U>`,
    },
    {
        name: 'S',
        id: 's',
        description: 'Inline struck-through text for obsolete or removed values.',
        parameters: ['i18n: optional translation key.'],
        example: `<S>Deprecated</S>`,
    },
    {
        name: 'Sup',
        id: 'sup',
        description: 'Inline superscript text.',
        parameters: ['i18n: optional translation key.'],
        example: `<P>m<Sup>2</Sup></P>`,
    },
    {
        name: 'Sub',
        id: 'sub',
        description: 'Inline subscript text.',
        parameters: ['i18n: optional translation key.'],
        example: `<P>H<Sub>2</Sub>O</P>`,
    },
    {
        name: 'Code',
        id: 'code',
        description: 'Inline monospace code text.',
        parameters: ['i18n: optional translation key.'],
        example: `<Code>order.status</Code>`,
    },
    {
        name: 'Pre',
        id: 'pre',
        description: 'Preformatted code block. Content is translation-backed when i18n is provided.',
        parameters: [
            'lang: optional language label. Defaults to text.',
            'i18n: optional translation key for block content.',
        ],
        example: `<Pre lang="json" i18n="examples.orderJson" />`,
    },
    {
        name: 'Br',
        id: 'br',
        description: 'Vertical spacer block.',
        parameters: ['No parameters.'],
        example: `<Br />`,
    },
    {
        name: 'Hr',
        id: 'hr',
        description: 'Horizontal separator line.',
        parameters: ['No parameters.'],
        example: `<Hr />`,
    },
    {
        name: 'Ul',
        id: 'ul',
        description: 'Unordered list container.',
        parameters: ['No parameters.'],
        example: `<Ul>
  <Li>Pack order</Li>
  <Li>Print label</Li>
</Ul>`,
    },
    {
        name: 'Ol',
        id: 'ol',
        description: 'Ordered list container.',
        parameters: ['No parameters.'],
        example: `<Ol>
  <Li>Validate</Li>
  <Li>Submit</Li>
</Ol>`,
    },
    {
        name: 'Li',
        id: 'li',
        description: 'List item for Ul or Ol.',
        parameters: ['i18n: optional translation key.'],
        example: `<Li i18n="orders.steps.validate" />`,
    },
    {
        name: 'Table',
        id: 'table',
        description: 'Table shell for structured rows and columns.',
        parameters: ['No parameters.'],
        example: `<Table>
  <Thead><Tr><Th>Order</Th><Th>Status</Th></Tr></Thead>
  <Tbody><Tr><Td>#1248</Td><Td>Open</Td></Tr></Tbody>
</Table>`,
    },
    {
        name: 'Thead',
        id: 'thead',
        description: 'Table header section.',
        parameters: ['No parameters.'],
        example: `<Thead>
  <Tr><Th>Name</Th><Th>Status</Th></Tr>
</Thead>`,
    },
    {
        name: 'Tbody',
        id: 'tbody',
        description: 'Table body section.',
        parameters: ['No parameters.'],
        example: `<Tbody>
  <Tr><Td>Alpha</Td><Td>Open</Td></Tr>
</Tbody>`,
    },
    {
        name: 'Tfoot',
        id: 'tfoot',
        description: 'Table footer section.',
        parameters: ['No parameters.'],
        example: `<Tfoot>
  <Tr><Td>Total</Td><Td>12</Td></Tr>
</Tfoot>`,
    },
    {
        name: 'Tr',
        id: 'tr',
        description: 'Table row.',
        parameters: ['No parameters.'],
        example: `<Tr>
  <Td>#1248</Td>
  <Td>Open</Td>
</Tr>`,
    },
    {
        name: 'Th',
        id: 'th',
        description: 'Table header cell.',
        parameters: ['i18n: optional translation key.'],
        example: `<Th i18n="orders.columns.status" />`,
    },
    {
        name: 'Td',
        id: 'td',
        description: 'Table data cell.',
        parameters: ['i18n: optional translation key.'],
        example: `<Td>${'${order.status}'}</Td>`,
    },
];

/** Renders one XML component reference entry. */
function ElementSection({ element }: { element: ElementDoc }) {
    return (
        <section className="space-y-3">
            <Heading id={element.id} level="h2">
                {element.name}
            </Heading>
            <p className="leading-7">{element.description}</p>
            <div>
                <p className="font-medium text-foreground">Parameters</p>
                <ul className="ml-6 list-disc space-y-2">
                    {element.parameters.map((parameter) => (
                        <li key={parameter}>{parameter}</li>
                    ))}
                </ul>
            </div>
            <CodeBlock language="xml">{element.example}</CodeBlock>
        </section>
    );
}

/** Renders the XML component element reference. */
function ComponentsContent() {
    return (
        <div className="flex flex-col gap-4">
            <Heading id="components" level="h1">
                Components
            </Heading>
            <p className="leading-7">
                Component elements cover actions, form controls, text, lists, tables, and small visual building blocks
                used inside SDK XML pages.
            </p>
            {componentDocs.map((element) => (
                <ElementSection key={element.id} element={element} />
            ))}
        </div>
    );
}

export const metadata = {
    lastUpdated: '2026-06-28',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/components.tsx',
};

export const content = <ComponentsContent />;
