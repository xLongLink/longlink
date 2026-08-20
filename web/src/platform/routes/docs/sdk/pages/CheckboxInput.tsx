import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';

export const metadata = {
    path: '/docs/sdk/pages/checkbox-input',
    title: 'CheckboxInput',
    description:
        'CheckboxInput toggles a single on/off value. Use it for settings like "Enable notifications", terms acceptance, or opt-in choices. For multiple checkboxes in a group, use CheckboxList instead.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/CheckboxInput.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Form'}</Text>
                    <Heading id="introduction" level={1}>
                        {'CheckboxInput'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Table
                    data={[
                        ['label', 'Visible field label.'],
                        ['value', 'Selected boolean value.'],
                        ['size', 'Control size.'],
                        ['description', 'Supporting field text.'],
                        ['htmlName', 'HTML form field name.'],
                        ['width', 'Control width.'],
                        ['disabledMessage', 'Message shown when disabled.'],
                        ['status', 'Validation status.'],
                        ['statusMessage', 'Validation status message.'],
                        ['isDisabled', 'Disables the field.'],
                        ['isReadOnly', 'Makes the field read-only.'],
                        ['isRequired', 'Marks the field as required.'],
                        ['isOptional', 'Marks the field as optional.'],
                        ['isLabelHidden', 'Visually hides the label.'],
                        ['isLoading', 'Shows a loading state.'],
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
                <CodeBlock code={'<CheckboxInput label="Active" value="$form.active" />'} language="xml" />
            </Stack>
        </Article>
    );
}
