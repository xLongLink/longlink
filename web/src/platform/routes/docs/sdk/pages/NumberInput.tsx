import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';

export const metadata = {
    path: '/docs/sdk/pages/number-input',
    title: 'NumberInput',
    description:
        'A form input for numeric values with built-in validation, min/max constraints, and step controls. Use NumberInput for quantities, measurements, percentages, and similar inputs.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/NumberInput.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Form'}</Text>
                    <Heading id="introduction" level={1}>
                        {'NumberInput'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Table
                    data={[
                        ['label', 'Visible field label.'],
                        ['value', 'Numeric field value.'],
                        ['description', 'Supporting field text.'],
                        ['units', 'Units shown with the value.'],
                        ['min', 'Minimum allowed value.'],
                        ['max', 'Maximum allowed value.'],
                        ['step', 'Increment between allowed values.'],
                        ['isDisabled', 'Disables the field.'],
                        ['isRequired', 'Marks the field as required.'],
                        ['isIntegerOnly', 'Restricts values to integers.'],
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
                    code={'<NumberInput label="Quantity" value="$form.quantity" min="1" step="1" units="items" />'}
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
