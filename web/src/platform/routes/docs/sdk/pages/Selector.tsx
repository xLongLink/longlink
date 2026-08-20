import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';

export const metadata = {
    path: '/docs/sdk/pages/selector',
    title: 'Selector',
    description:
        'A dropdown selector for choosing a single value from a list of options. Supports labels, validation, descriptions, and required or optional states. Use it in forms and settings when presenting a moderate number of options.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'options', label: 'Options', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Selector.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Form'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Selector'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Table
                    data={[
                        ['label', 'Visible field label.'],
                        ['value', 'Selected option value.'],
                        ['size', 'Control size.'],
                        ['variant', 'Control variant.'],
                        ['description', 'Supporting field text.'],
                        ['placeholder', 'Placeholder text.'],
                        ['searchPlaceholder', 'Search field placeholder.'],
                        ['htmlName', 'HTML form field name.'],
                        ['width', 'Control width.'],
                        ['labelTooltip', 'Tooltip for the label.'],
                        ['placement', 'Options layer placement.'],
                        ['disabledMessage', 'Message shown when disabled.'],
                        ['status', 'Validation status.'],
                        ['statusMessage', 'Validation status message.'],
                        ['statusVariant', 'Presentation of the status message.'],
                        ['hasClear', 'Shows a clear control.'],
                        ['hasSearch', 'Shows a search field.'],
                        ['isDisabled', 'Disables the field.'],
                        ['isRequired', 'Marks the field as required.'],
                        ['isOptional', 'Marks the field as optional.'],
                        ['isLabelHidden', 'Visually hides the label.'],
                        ['isLoading', 'Shows a loading state.'],
                        ['isDefaultOpen', 'Opens the options layer initially.'],
                        ['if', 'Conditional rendering expression.'],
                        ['slot', 'Named child slot.'],
                    ].map(([parameter, description]) => ({ parameter, description }))}
                    columns={[
                        { key: 'parameter', header: 'Parameter', width: proportional(1) },
                        { key: 'description', header: 'Description', width: proportional(3) },
                    ]}
                    density="compact"
                    dividers="rows"
                />
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={
                        '<Selector label="Status" value="$filters.status" hasClear="true">\n  <SelectorOption value="open" label="Open" />\n  <SelectorOption value="closed" label="Closed" />\n</Selector>'
                    }
                    language="xml"
                />
                <Heading id="options" level={2}>
                    Options
                </Heading>
                <Text as="p">{'Define each selectable value with a SelectorOption child.'}</Text>
                <CodeBlock code={'<SelectorOption value="open" label="Open" />'} language="xml" />
            </Stack>
        </Article>
    );
}
