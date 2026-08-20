import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';

export const metadata = {
    path: '/docs/sdk/pages/switch',
    title: 'Switch',
    description:
        'A toggle control for on/off states that take effect immediately. Supports labels, descriptions, loading states, and validation. Use it for settings or preferences that apply instantly. For changes requiring a form submission, use a checkbox instead.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Switch.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Form'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Switch'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Table
                    data={[
                        ['label', 'Visible field label.'],
                        ['value', 'Selected boolean value.'],
                        ['description', 'Supporting field text.'],
                        ['htmlName', 'HTML form field name.'],
                        ['width', 'Control width.'],
                        ['size', 'Control size.'],
                        ['labelTooltip', 'Tooltip for the label.'],
                        ['disabledMessage', 'Message shown when disabled.'],
                        ['labelPosition', 'Position of the label.'],
                        ['labelSpacing', 'Spacing between label and switch.'],
                        ['status', 'Validation status.'],
                        ['statusMessage', 'Validation status message.'],
                        ['isDisabled', 'Disables the field.'],
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
                <CodeBlock code={'<Switch label="Notifications" value="$settings.notifications" />'} language="xml" />
            </Stack>
        </Article>
    );
}
