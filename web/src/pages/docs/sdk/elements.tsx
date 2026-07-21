import { FileCode2 } from 'lucide-react';
import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { CodeBlock } from '@/components/CodeBlock';

type ElementAttribute = {
    name: string;
    description: string;
    required?: boolean;
};

type ElementDoc = {
    name: string;
    slug: string;
    category: string;
    summary: string;
    usage: string;
    example: string;
    attributes: ElementAttribute[];
    attributesTitle?: string;
    children?: string;
};

const lastUpdated = '2026-07-21';
const editUrl = 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/elements.tsx';

const runtimeConceptDocs: ElementDoc[] = [
    {
        name: 'if',
        slug: 'if',
        category: 'LongLink Runtime Concepts',
        summary: 'Conditionally renders an XML node when its expression evaluates to a truthy value.',
        usage: 'Add if to rendered XML nodes and adapter-consumed child nodes that should appear only in one state.',
        attributesTitle: 'Rules',
        attributes: [
            { name: 'if', description: 'Expression evaluated against the current XML runtime scope.', required: true },
            {
                name: 'scope',
                description: 'Can read State, Query, params, and loop aliases available at the node position.',
            },
            {
                name: 'result',
                description: 'Falsy results skip the node and its children; truthy results render normally.',
            },
        ],
        example: `<Badge if="\${order.blocked}" variant="error" i18n="orders.blocked" />

<Selector label="Status" value="$filters.status">
  <SelectorOption value="open" label="Open" />
  <SelectorOption if="\${user.canClose}" value="closed" label="Closed" />
</Selector>`,
    },
    {
        name: 'i18n',
        slug: 'i18n',
        category: 'LongLink Runtime Concepts',
        summary: 'Looks up visible copy from the active XML translation catalog.',
        usage: 'Use i18n on text-bearing elements instead of hardcoding visible copy in page XML.',
        attributesTitle: 'Rules',
        attributes: [
            {
                name: 'i18n',
                description: 'Literal dotted translation key such as orders.title. It is not an expression.',
                required: true,
            },
            { name: 'values', description: 'Optional expression object for ICU message interpolation.' },
            { name: 'count', description: 'Optional numeric expression supplied to ICU plural messages.' },
        ],
        example: `<Heading level="1" i18n="orders.title" />
<Text as="p" i18n="orders.summary" values="\${{ customer: order.customer }}" />`,
    },
    {
        name: 'values',
        slug: 'values',
        category: 'LongLink Runtime Concepts',
        summary: 'Supplies interpolation values for an ICU message resolved through i18n.',
        usage: 'Use values when a translated message needs runtime data such as names, counts, or status labels.',
        attributesTitle: 'Rules',
        attributes: [
            { name: 'values', description: 'Expression that must evaluate to one object.', required: true },
            { name: 'keys', description: 'Object keys must match placeholders in the translation message.' },
            {
                name: 'invalid values',
                description: 'Arrays, strings, numbers, booleans, null, and undefined are rejected.',
            },
        ],
        example: `<Text
  i18n="orders.assigned"
  values="\${{ assignee: order.assignee.name, number: order.number }}"
/>`,
    },
    {
        name: 'count',
        slug: 'count',
        category: 'LongLink Runtime Concepts',
        summary: 'Passes a numeric count into an ICU plural translation.',
        usage: 'Use count with i18n messages that contain plural branches.',
        attributesTitle: 'Rules',
        attributes: [
            {
                name: 'count',
                description: 'Expression coerced to a number and exposed to ICU as count.',
                required: true,
            },
            { name: 'values.count', description: 'The runtime count is merged into values for the translation call.' },
            {
                name: 'non-numeric values',
                description: 'Values that cannot become numbers are ignored for plural selection.',
            },
        ],
        example: `<Text i18n="orders.count" count="\${orders.items.length}" />`,
    },
    {
        name: 'Expressions',
        slug: 'expressions',
        category: 'LongLink Runtime Concepts',
        summary: 'Evaluates a safe JavaScript expression subset against the XML runtime scope.',
        usage: 'Use expressions for conditions, derived values, request payloads, query paths, and bindings.',
        attributesTitle: 'Rules',
        attributes: [
            { name: '$path', description: 'Reads a runtime value and creates writable control bindings.' },
            { name: '${...}', description: 'Evaluates a typed expression when the entire value is wrapped.' },
            { name: 'mixed interpolation', description: 'Interpolates ${...} segments into a string value.' },
            {
                name: 'allowed calls',
                description: 'Boolean, Number, String, Array.isArray, and selected Math helpers are allowed.',
            },
        ],
        example: `<TextInput label="Name" value="$form.name" />
<Button isDisabled="\${!form.name || form.saving}" label="Save" />
<Link to="/orders/\${params.order}" label="Open order" />`,
    },
    {
        name: 'Bindings',
        slug: 'bindings',
        category: 'LongLink Runtime Concepts',
        summary: 'Connects writable control values to State objects declared in the XML runtime.',
        usage: 'Use bindings when form controls need to edit local page state before an Action sends data.',
        attributesTitle: 'Rules',
        attributes: [
            {
                name: 'value="$state.path"',
                description: 'Binds a control value to a State object field.',
                required: true,
            },
            { name: 'safe names', description: 'State ids and path segments must be safe property names.' },
            { name: 'unbound values', description: 'Literal and computed values render as local control state only.' },
        ],
        example: `<State id="form" name="" active="true" />

<TextInput label="Name" value="$form.name" />
<Switch label="Active" value="$form.active" />`,
    },
    {
        name: 'Translations',
        slug: 'translations',
        category: 'LongLink Runtime Concepts',
        summary: 'Defines localized XML page copy in flat catalog files under src/i18n.',
        usage: 'Keep visible copy in translation catalogs and reference it from XML with i18n keys.',
        attributesTitle: 'Rules',
        attributes: [
            { name: 'location', description: 'Catalog files live under src/i18n, such as src/i18n/en.json.' },
            {
                name: 'shape',
                description: 'Each dotted key maps to an object with defaultMessage and optional description.',
            },
            { name: 'generator', description: 'Run longlink translations generate after adding or renaming XML keys.' },
        ],
        example: `{
  "orders.title": {
    "defaultMessage": "Orders"
  },
  "orders.count": {
    "defaultMessage": "{count, plural, =0 {No orders} one {# order} other {# orders}}"
  }
}`,
    },
    {
        name: 'Dynamic Pages',
        slug: 'dynamic-pages',
        category: 'LongLink Runtime Concepts',
        summary: 'Maps bracketed XML page filenames to browser route parameters.',
        usage: 'Use dynamic pages when one XML definition should render many records by route id.',
        attributesTitle: 'Rules',
        attributes: [
            { name: '[name].xml', description: 'Declares one dynamic path segment.' },
            { name: 'params', description: 'Matched route parameters are exposed to XML expressions under params.' },
            { name: 'navigation', description: 'Dynamic pages inherit their tab from the first static route segment.' },
        ],
        example: `src/pages/issues/[issue].xml -> /issues/:issue

<Query id="issue" path="/api/issues/\${params.issue}" />
<Heading level="1" value="$issue.title" />`,
    },
    {
        name: 'Page Files',
        slug: 'page-files',
        category: 'LongLink Runtime Concepts',
        summary: 'Registers XML pages from conventional SDK application source folders.',
        usage: 'Place XML page files under src/pages so the LongLink SDK can discover and serve them.',
        attributesTitle: 'Rules',
        attributes: [
            { name: 'src/pages/index.xml', description: 'Registers the browser root route.' },
            { name: 'nested files', description: 'Nested page files become nested browser routes.' },
            {
                name: 'src/i18n',
                description: 'Translation catalogs are served alongside XML pages from the app source tree.',
            },
        ],
        example: `src/
  pages/
    index.xml
    orders.xml
    orders/[order].xml
  i18n/
    en.json`,
    },
];

const elementDocs: ElementDoc[] = [
    {
        name: 'longlink',
        slug: 'longlink',
        category: 'LongLink State Elements',
        summary: 'Wraps one XML page and declares optional navigation metadata for the LongLink web runtime.',
        usage: 'Use longlink as the root element in every XML page file.',
        attributes: [
            { name: 'name', description: 'Readable page tab label included in the page manifest.' },
            { name: 'icon', description: 'Lucide icon slug included in the page manifest.' },
        ],
        children: 'State, Query, layout elements, component elements, and rendered control flow.',
        example: `<longlink name="Orders" icon="clipboard-list">
  <Heading level="1" i18n="orders.title" />
  <Text as="p" i18n="orders.description" />
</longlink>`,
    },
    {
        name: 'State',
        slug: 'state',
        category: 'LongLink State Elements',
        summary: 'Declares local reactive page state before the page renders.',
        usage: 'Use State near the top of the page when controls need writable local values.',
        attributes: [
            { name: 'id', description: 'Literal state name exposed in XML expressions.', required: true },
            {
                name: 'additional attributes',
                description: 'Initial state fields. JSON values are parsed first, otherwise the value is evaluated.',
            },
        ],
        children: 'State is setup-only and cannot have children.',
        example: `<State id="form" name="" active="true" />

<TextInput label="Name" value="$form.name" />`,
    },
    {
        name: 'Query',
        slug: 'query',
        category: 'LongLink State Elements',
        summary: 'Fetches JSON data before rendering and stores it in the XML runtime scope.',
        usage: 'Use Query for page data that descendants read through expressions, loops, and bindings.',
        attributes: [
            { name: 'id', description: 'Literal query name exposed in XML expressions.', required: true },
            { name: 'path', description: 'Application-relative request path.', required: true },
        ],
        children: 'Query is setup-only and cannot have children.',
        example: `<Query id="orders" path="/api/orders" />

<For each="$orders.items" as="order">
  <Text value="$order.number" />
</For>`,
    },
    {
        name: 'Action',
        slug: 'action',
        category: 'LongLink State Elements',
        summary: 'Provides request behavior to child triggers and refreshes selected runtime values.',
        usage: 'Wrap a Button or control that should send an application request when activated.',
        attributes: [
            { name: 'action', description: 'Application-relative request path.' },
            { name: 'method', description: 'HTTP method. Defaults to POST.' },
            { name: 'json', description: 'Expression payload sent as JSON.' },
            { name: 'form', description: 'Expression object sent as multipart form data.' },
            { name: 'invalidate', description: 'Setup ids to refresh after a successful request.' },
        ],
        children: 'Usually contains one Button or ButtonGroup entry.',
        example: `<Action action="/api/orders/\${order.id}/complete" method="PATCH" invalidate="\${['orders']}">
  <Button label="Complete" />
</Action>`,
    },
    {
        name: 'For',
        slug: 'for',
        category: 'LongLink State Elements',
        summary: 'Repeats child XML for every item in an array.',
        usage: 'Use For when query results or state arrays should render repeated rows, cards, or controls.',
        attributes: [
            { name: 'each', description: 'Expression that resolves to an array.', required: true },
            { name: 'as', description: 'Local item variable name for each iteration.', required: true },
        ],
        children: 'Any rendered XML elements. Each iteration gets the item alias and index value.',
        example: `<For each="$orders.items" as="order">
  <Card>
    <Text value="$order.number" />
  </Card>
</For>`,
    },
    {
        name: 'Button',
        slug: 'button',
        category: 'Action',
        summary: 'Renders a labeled command, submit trigger, or action trigger.',
        usage: 'Use Button for commands. Use Link for navigation.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible button text.', required: true },
            { name: 'variant', description: 'primary, secondary, ghost, or destructive.' },
            { name: 'size', description: 'sm, md, or lg.' },
            { name: 'type', description: 'button, submit, or reset.' },
            { name: 'isDisabled', description: 'Disables the button.' },
            { name: 'isLoading', description: 'Shows a loading state.' },
        ],
        children: 'Optional child content can override visible content while the label remains the accessible name.',
        example: `<Action action="/api/orders" invalidate="orders">
  <Button label="Save" variant="primary" />
</Action>`,
    },
    {
        name: 'ButtonGroup',
        slug: 'button-group',
        category: 'Action',
        summary: 'Groups related buttons under one accessible label.',
        usage: 'Use ButtonGroup when several adjacent commands form one connected control.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible group label.', required: true },
            { name: 'orientation', description: 'horizontal or vertical.' },
            { name: 'size', description: 'sm, md, or lg.' },
            { name: 'isDisabled', description: 'Disables every grouped button.' },
        ],
        children: 'Button and Action children.',
        example: `<ButtonGroup label="Order actions">
  <Button label="Copy" />
  <Button label="Paste" />
</ButtonGroup>`,
    },
    {
        name: 'Link',
        slug: 'link',
        category: 'Action',
        summary: 'Navigates inside a LongLink Application or opens an external URL.',
        usage: 'Use Link for destinations. Use Button for commands.',
        attributes: [
            { name: 'to', description: 'Application route destination.' },
            { name: 'href', description: 'URL destination.' },
            { name: 'label or i18n', description: 'Accessible link text.' },
            { name: 'hasUnderline', description: 'Shows an underline.' },
            { name: 'isExternalLink', description: 'Marks an external destination.' },
        ],
        children: 'Optional text content.',
        example: `<Link to="/orders/\${order.id}" label="Open order" hasUnderline="true" />`,
    },
    {
        name: 'Card',
        slug: 'card',
        category: 'Container',
        summary: 'Groups one discrete item on an Astryx surface.',
        usage: 'Use Card for self-contained content that can be compared, reordered, or removed independently.',
        attributes: [
            { name: 'variant', description: 'default, transparent, muted, or named color surface.' },
            { name: 'padding', description: 'Astryx spacing value.' },
            { name: 'width, height, maxWidth, minHeight', description: 'Optional size constraints.' },
        ],
        children: 'Any rendered XML content.',
        example: `<Card variant="muted">
  <Stack gap="2">
    <Heading level="3" label="Order" />
    <Text value="$order.number" />
  </Stack>
</Card>`,
    },
    {
        name: 'Avatar',
        slug: 'avatar',
        category: 'Content',
        summary: 'Shows a user or team identity from an image, name, or fallback.',
        usage: 'Use Avatar anywhere a person or team needs a compact visual identifier.',
        attributes: [
            { name: 'src', description: 'Primary image URL.' },
            { name: 'fallbackSrc', description: 'Fallback image URL.' },
            { name: 'name', description: 'Name used for initials and default alt text.' },
            { name: 'alt', description: 'Explicit alternative text.' },
            { name: 'size', description: 'tiny, xsmall, small, medium, or large.' },
        ],
        example: `<Avatar src="$user.avatarUrl" name="$user.name" alt="$user.name" size="medium" />`,
    },
    {
        name: 'Code',
        slug: 'code',
        category: 'Content',
        summary: 'Renders an inline code value.',
        usage: 'Use Code for field names, route snippets, identifiers, and short inline technical values.',
        attributes: [
            { name: 'value', description: 'Literal or expression value to render.' },
            { name: 'i18n', description: 'Translation key for localized inline code text.' },
        ],
        children: 'Optional inline text content.',
        example: `<Text>
  Status field: <Code value="status" />
</Text>`,
    },
    {
        name: 'Heading',
        slug: 'heading',
        category: 'Content',
        summary: 'Creates semantic section headings.',
        usage: 'Use Heading to structure XML pages with explicit document hierarchy.',
        attributes: [
            { name: 'level', description: 'Heading level from 1 to 6.', required: true },
            { name: 'label, value, or i18n', description: 'Heading text.' },
            { name: 'values', description: 'Translation interpolation values.' },
            { name: 'count', description: 'ICU plural count.' },
        ],
        children: 'Optional heading text content.',
        example: `<Heading level="1" i18n="orders.title" />`,
    },
    {
        name: 'Icon',
        slug: 'icon',
        category: 'Content',
        summary: 'Displays a semantic Astryx icon.',
        usage: 'Use Icon for compact visual signals that support nearby text.',
        attributes: [
            {
                name: 'icon',
                description: 'Semantic icon name such as info, success, warning, error, search, or wrench.',
                required: true,
            },
            { name: 'size', description: 'Icon size.' },
            { name: 'color', description: 'Theme color role.' },
        ],
        example: `<Icon icon="info" size="sm" color="accent" />`,
    },
    {
        name: 'Text',
        slug: 'text',
        category: 'Content',
        summary: 'Renders paragraph, label, span, and supporting text content.',
        usage: 'Use Text for readable copy and values that are not headings.',
        attributes: [
            { name: 'as', description: 'span, p, div, or label.' },
            { name: 'type', description: 'body, large, label, supporting, code, display style, or inherit.' },
            { name: 'label, value, or i18n', description: 'Text content.' },
            { name: 'values', description: 'Translation interpolation values.' },
            { name: 'count', description: 'ICU plural count.' },
        ],
        children: 'Optional text content.',
        example: `<Text as="p" i18n="orders.summary" values="\${{ number: order.number }}" />`,
    },
    {
        name: 'CheckboxInput',
        slug: 'checkbox-input',
        category: 'Data Input',
        summary: 'Captures one boolean value.',
        usage: 'Use CheckboxInput for form-submitted boolean choices such as acceptance or inclusion.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible field label.', required: true },
            { name: 'value', description: 'Boolean value or writable state binding.', required: true },
            { name: 'isRequired, isOptional, isDisabled', description: 'Explicit field states.' },
            { name: 'status', description: 'Validation status.' },
        ],
        example: `<CheckboxInput label="Active" value="$form.active" />`,
    },
    {
        name: 'FileInput',
        slug: 'file-input',
        category: 'Data Input',
        summary: 'Collects browser File values for form actions.',
        usage: 'Use FileInput when an Action form payload needs uploaded files.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible field label.', required: true },
            { name: 'value', description: 'File value or writable state binding.', required: true },
            { name: 'accept', description: 'Accepted file extensions or MIME types.' },
            { name: 'mode', description: 'input or dropzone.' },
            { name: 'isMultiple', description: 'Allows multiple selected files.' },
        ],
        example: `<FileInput label="Attachment" value="$form.file" accept=".pdf" />`,
    },
    {
        name: 'NumberInput',
        slug: 'number-input',
        category: 'Data Input',
        summary: 'Collects numeric values.',
        usage: 'Use NumberInput for quantities, amounts, percentages, and bounded numeric fields.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible field label.', required: true },
            { name: 'value', description: 'Number value or writable state binding.', required: true },
            { name: 'min, max, step', description: 'Numeric constraints.' },
            { name: 'units', description: 'Unit text shown with the input.' },
            { name: 'isIntegerOnly', description: 'Restricts input to integers.' },
        ],
        example: `<NumberInput label="Quantity" value="$form.quantity" min="1" step="1" units="items" />`,
    },
    {
        name: 'RadioList',
        slug: 'radio-list',
        category: 'Data Input',
        summary: 'Presents one visible single-choice option group.',
        usage: 'Use RadioList when users need to compare a small set of mutually exclusive options.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible group label.', required: true },
            { name: 'value', description: 'Selected value or writable state binding.', required: true },
            { name: 'orientation', description: 'vertical or horizontal.' },
            { name: 'size', description: 'sm or md.' },
        ],
        children: 'RadioListItem children.',
        example: `<RadioList label="Plan" value="$form.plan" orientation="horizontal">
  <RadioListItem value="solo" label="Solo" />
  <RadioListItem value="team" label="Team" />
</RadioList>`,
    },
    {
        name: 'RadioListItem',
        slug: 'radio-list-item',
        category: 'Data Input',
        summary: 'Defines one option inside a RadioList.',
        usage: 'Use RadioListItem only as a direct child of RadioList.',
        attributes: [
            { name: 'value', description: 'Submitted option value.', required: true },
            { name: 'label or i18n', description: 'Visible option text.', required: true },
            { name: 'description', description: 'Optional supporting text.' },
            { name: 'isDisabled', description: 'Disables this option.' },
        ],
        example: `<RadioListItem value="team" label="Team" description="Shared workspace" />`,
    },
    {
        name: 'Selector',
        slug: 'selector',
        category: 'Data Input',
        summary: 'Presents a dropdown selection control.',
        usage: 'Use Selector when a moderate set of options should stay compact until opened.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible field label.', required: true },
            { name: 'value', description: 'Selected value or writable state binding.' },
            { name: 'hasClear', description: 'Allows clearing the selected value.' },
            { name: 'hasSearch', description: 'Adds option search.' },
            { name: 'placeholder', description: 'Placeholder shown without a selected value.' },
        ],
        children: 'SelectorOption children.',
        example: `<Selector label="Status" value="$filters.status" hasClear="true">
  <SelectorOption value="open" label="Open" />
  <SelectorOption value="closed" label="Closed" />
</Selector>`,
    },
    {
        name: 'SelectorOption',
        slug: 'selector-option',
        category: 'Data Input',
        summary: 'Defines one option inside a Selector.',
        usage: 'Use SelectorOption only as a direct child of Selector.',
        attributes: [
            { name: 'value', description: 'Selected option value.', required: true },
            { name: 'label or i18n', description: 'Visible option text.' },
            { name: 'isDisabled', description: 'Disables this option.' },
            { name: 'if', description: 'Optional expression that controls whether the option exists.' },
        ],
        example: `<SelectorOption value="open" label="Open" />`,
    },
    {
        name: 'Slider',
        slug: 'slider',
        category: 'Data Input',
        summary: 'Captures bounded numeric values through a range control.',
        usage: 'Use Slider for approximate values where visual adjustment is faster than typing.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible field label.', required: true },
            { name: 'value', description: 'Numeric value or writable state binding.', required: true },
            { name: 'min, max, step', description: 'Numeric range constraints.' },
            { name: 'valueDisplay', description: 'tooltip, text, or none.' },
            { name: 'orientation', description: 'horizontal or vertical.' },
        ],
        example: `<Slider label="Budget" value="$form.budget" min="500" max="10000" step="500" />`,
    },
    {
        name: 'Switch',
        slug: 'switch',
        category: 'Data Input',
        summary: 'Captures an immediate on/off setting.',
        usage: 'Use Switch for preferences that take effect as soon as they change.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible setting label.', required: true },
            { name: 'value', description: 'Boolean value or writable state binding.', required: true },
            { name: 'labelPosition', description: 'start or end.' },
            { name: 'labelSpacing', description: 'hug or spread.' },
            { name: 'isDisabled', description: 'Disables the switch.' },
        ],
        example: `<Switch label="Notifications" value="$settings.notifications" />`,
    },
    {
        name: 'TextArea',
        slug: 'text-area',
        category: 'Data Input',
        summary: 'Collects longer text values.',
        usage: 'Use TextArea for comments, notes, descriptions, and other multi-line text.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible field label.', required: true },
            { name: 'value', description: 'String value or writable state binding.', required: true },
            { name: 'rows', description: 'Visible text rows.' },
            { name: 'maxLength', description: 'Character counter limit.' },
            { name: 'status', description: 'Validation status.' },
        ],
        example: `<TextArea label="Notes" value="$form.notes" rows="4" />`,
    },
    {
        name: 'TextInput',
        slug: 'text-input',
        category: 'Data Input',
        summary: 'Collects short text values.',
        usage: 'Use TextInput for names, identifiers, emails, search terms, and other single-line values.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible field label.', required: true },
            { name: 'value', description: 'String value or writable state binding.', required: true },
            { name: 'type', description: 'text, password, or email.' },
            { name: 'placeholder', description: 'Placeholder text.' },
            { name: 'hasClear', description: 'Shows a clear action when the value is non-empty.' },
        ],
        example: `<TextInput label="Customer name" value="$form.name" isRequired="true" />`,
    },
    {
        name: 'Badge',
        slug: 'badge',
        category: 'Feedback & Status',
        summary: 'Displays a compact status or enumerated label.',
        usage: 'Use Badge for short, stable labels such as role, status, or category.',
        attributes: [
            { name: 'label or i18n', description: 'Badge text.', required: true },
            { name: 'variant', description: 'neutral, info, success, warning, or error.' },
        ],
        example: `<Badge label="$order.status" variant="info" />`,
    },
    {
        name: 'Banner',
        slug: 'banner',
        category: 'Feedback & Status',
        summary: 'Shows persistent page-level feedback.',
        usage: 'Use Banner for important information, warnings, errors, or success states that need space.',
        attributes: [
            { name: 'title or i18n', description: 'Banner title.', required: true },
            { name: 'status', description: 'info, warning, error, or success.' },
        ],
        children: 'Optional detail content.',
        example: `<Banner status="warning" title="Review required">
  <Text value="This order needs approval before completion." />
</Banner>`,
    },
    {
        name: 'Divider',
        slug: 'divider',
        category: 'Layout',
        summary: 'Separates related regions with a rule.',
        usage: 'Use Divider when spacing alone is not enough to show a boundary.',
        attributes: [
            { name: 'orientation', description: 'horizontal or vertical.' },
            { name: 'variant', description: 'subtle or strong.' },
            { name: 'label or i18n', description: 'Optional divider label.' },
        ],
        example: `<Divider i18n="common.or" variant="strong" />`,
    },
    {
        name: 'FormLayout',
        slug: 'form-layout',
        category: 'Layout',
        summary: 'Arranges controls with consistent form spacing.',
        usage: 'Use FormLayout around controls that own their labels and validation state.',
        attributes: [{ name: 'direction', description: 'vertical, horizontal, or horizontal-labels.' }],
        children:
            'Form controls such as TextInput, TextArea, NumberInput, Selector, CheckboxInput, Switch, and Slider.',
        example: `<FormLayout direction="vertical">
  <TextInput label="Title" value="$form.title" />
  <TextArea label="Notes" value="$form.notes" />
</FormLayout>`,
    },
    {
        name: 'Grid',
        slug: 'grid',
        category: 'Layout',
        summary: 'Creates fixed or responsive multi-column layouts.',
        usage: 'Use Grid for card galleries, dashboards, and column-based content.',
        attributes: [
            { name: 'columns', description: 'Fixed number of columns.' },
            { name: 'minColumnWidth', description: 'Minimum responsive column width.' },
            { name: 'maxColumns', description: 'Maximum responsive column count.' },
            { name: 'repeat', description: 'fill or fit.' },
            { name: 'gap', description: 'Astryx spacing value.' },
        ],
        children: 'Any rendered XML content.',
        example: `<Grid minColumnWidth="240" maxColumns="3" repeat="fit" gap="4">
  <Card><Text value="First" /></Card>
  <Card><Text value="Second" /></Card>
</Grid>`,
    },
    {
        name: 'Stack',
        slug: 'stack',
        category: 'Layout',
        summary: 'Arranges children vertically or horizontally.',
        usage: 'Use Stack as the default layout primitive for spacing groups of elements.',
        attributes: [
            { name: 'direction', description: 'vertical or horizontal.' },
            { name: 'gap', description: 'Astryx spacing value.' },
            { name: 'justify', description: 'start, center, end, between, around, or evenly.' },
            { name: 'align', description: 'start, center, end, or stretch.' },
            { name: 'wrap', description: 'Allows horizontal children to wrap.' },
        ],
        children: 'Any rendered XML content.',
        example: `<Stack direction="horizontal" justify="between" align="center" gap="3">
  <Text value="$order.number" />
  <Button label="Open" />
</Stack>`,
    },
    {
        name: 'SideNav',
        slug: 'side-nav',
        category: 'Navigation',
        summary: 'Renders application navigation in a sidebar container.',
        usage: 'Use SideNav when an XML page owns a local navigation list.',
        attributes: [{ name: 'label or i18n', description: 'Accessible navigation label.', required: true }],
        children: 'SideNavItem children.',
        example: `<SideNav label="Application navigation">
  <SideNavItem value="/orders" label="Orders" />
  <SideNavItem value="/customers" label="Customers" />
</SideNav>`,
    },
    {
        name: 'SideNavItem',
        slug: 'side-nav-item',
        category: 'Navigation',
        summary: 'Defines one destination inside a SideNav.',
        usage: 'Use SideNavItem only as a child of SideNav.',
        attributes: [
            { name: 'value', description: 'Destination path.', required: true },
            { name: 'label or i18n', description: 'Visible navigation label.', required: true },
            { name: 'icon', description: 'Optional icon name.' },
        ],
        example: `<SideNavItem value="/orders" label="Orders" icon="clipboard-list" />`,
    },
    {
        name: 'Tab',
        slug: 'tab',
        category: 'Navigation',
        summary: 'Defines one tab destination inside a TabList.',
        usage: 'Use Tab only as a child of TabList.',
        attributes: [
            { name: 'value', description: 'Tab value or destination.', required: true },
            { name: 'label or i18n', description: 'Visible tab label.', required: true },
            { name: 'icon', description: 'Optional icon name.' },
            { name: 'href', description: 'Optional route destination.' },
        ],
        example: `<Tab value="overview" label="Overview" />`,
    },
    {
        name: 'TabList',
        slug: 'tab-list',
        category: 'Navigation',
        summary: 'Renders flat tab navigation.',
        usage: 'Use TabList for switching between related page views.',
        attributes: [
            { name: 'label or i18n', description: 'Accessible tab list label.', required: true },
            { name: 'value', description: 'Selected tab value.' },
            { name: 'size', description: 'sm, md, or lg.' },
            { name: 'hasDivider', description: 'Shows a divider under the tabs.' },
        ],
        children: 'Tab children.',
        example: `<TabList label="Order views" value="overview">
  <Tab value="overview" label="Overview" />
  <Tab value="activity" label="Activity" />
</TabList>`,
    },
    {
        name: 'Dialog',
        slug: 'dialog',
        category: 'Overlay',
        summary: 'Renders a modal workflow from one flat owner element.',
        usage: 'Use Dialog for focused flows that should sit above the current page.',
        attributes: [
            { name: 'title or i18n', description: 'Dialog title.', required: true },
            { name: 'isOpen', description: 'Boolean value or writable state binding.' },
            { name: 'purpose', description: 'info, form, confirmation, or required.' },
            { name: 'width', description: 'Dialog width.' },
        ],
        children: 'Dialog body content.',
        example: `<Dialog title="Edit order" isOpen="$dialog.open">
  <FormLayout>
    <TextInput label="Name" value="$form.name" />
  </FormLayout>
</Dialog>`,
    },
    {
        name: 'Table',
        slug: 'table',
        category: 'Table & List',
        summary: 'Displays tabular data from an array.',
        usage: 'Use Table for row-oriented business data with consistent columns.',
        attributes: [
            { name: 'data', description: 'Array expression used as table rows.', required: true },
            { name: 'rowName', description: 'Local variable name for custom column children.' },
            { name: 'density', description: 'compact, balanced, or spacious.' },
            { name: 'isStriped', description: 'Shows alternating row backgrounds.' },
            { name: 'hasHover', description: 'Adds row hover styling.' },
        ],
        children: 'TableColumn children.',
        example: `<Table data="$orders.items" rowName="order">
  <TableColumn key="number" header="Number" field="number" />
  <TableColumn key="status" header="Status" field="status" />
</Table>`,
    },
    {
        name: 'TableColumn',
        slug: 'table-column',
        category: 'Table & List',
        summary: 'Declares one column inside a Table.',
        usage: 'Use TableColumn to define column headers, fields, and custom cell content.',
        attributes: [
            { name: 'key', description: 'Stable column key.', required: true },
            { name: 'header or i18n', description: 'Column header text.', required: true },
            { name: 'field', description: 'Property path read from the row item.' },
            { name: 'width', description: 'Column width.' },
            { name: 'align', description: 'start, center, or end.' },
        ],
        children: 'Optional custom cell content rendered for each row.',
        example: `<TableColumn key="status" header="Status">
  <Badge label="$order.status" variant="info" />
</TableColumn>`,
    },
];

const pageReferenceDocs = [...runtimeConceptDocs, ...elementDocs];

export const pageElementHrefByName = pageReferenceDocs.reduce<Record<string, string>>((paths, element) => {
    paths[element.name] = `/docs/sdk/pages/${element.slug}`;
    return paths;
}, {});

/** Renders one XML element documentation article. */
function ElementReference({ element }: { element: ElementDoc }) {
    return (
        <Stack gap={5}>
            <Stack gap={2}>
                <Text type="supporting">{element.category}</Text>
                <Heading id={element.slug} level={1}>
                    {element.name}
                </Heading>
            </Stack>
            <Stack gap={3}>
                <Heading id="definition" level={2}>
                    Definition
                </Heading>
                <Text as="p">{element.summary}</Text>
            </Stack>
            <Stack gap={3}>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <Text as="p">{element.usage}</Text>
            </Stack>
            <Stack gap={3}>
                <Heading id="attributes" level={2}>
                    {element.attributesTitle ?? 'Attributes'}
                </Heading>
                <List listStyle="disc">
                    {element.attributes.map((attribute) => (
                        <ListItem
                            key={attribute.name}
                            label={
                                <Text>
                                    <Code>{attribute.name}</Code>
                                    {attribute.required ? ' required. ' : '. '}
                                    {attribute.description}
                                </Text>
                            }
                        />
                    ))}
                </List>
            </Stack>
            {element.children ? (
                <Stack gap={3}>
                    <Heading id="children" level={2}>
                        Children
                    </Heading>
                    <Text as="p">{element.children}</Text>
                </Stack>
            ) : null}
            <Stack gap={3}>
                <Heading id="example" level={2}>
                    Example
                </Heading>
                <CodeBlock language="xml">{element.example}</CodeBlock>
            </Stack>
        </Stack>
    );
}

/** Builds table-of-contents metadata for one element page. */
function elementMetadata(element: ElementDoc) {
    return {
        toc: [
            { id: 'definition', label: 'Definition' },
            { id: 'usage', label: 'Usage' },
            { id: 'attributes', label: 'Attributes' },
            ...(element.children ? [{ id: 'children', label: 'Children' }] : []),
            { id: 'example', label: 'Example' },
        ],
        lastUpdated,
        editUrl,
    };
}

export const pageElementDocPages = pageReferenceDocs.map((element) => ({
    title: element.name,
    path: pageElementHrefByName[element.name],
    icon: <FileCode2 aria-hidden="true" size={16} />,
    content: <ElementReference element={element} />,
    metadata: elementMetadata(element),
}));
