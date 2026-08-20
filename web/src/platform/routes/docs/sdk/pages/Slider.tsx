import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';

export const metadata = {
    path: '/docs/sdk/pages/slider',
    title: 'Slider',
    description:
        'A draggable control for selecting a numeric value or range within defined bounds. Supports single value and range selection, tick marks, custom value formatting, and vertical orientation. Use it when users need to explore a continuous range, such as volume, price, or percentage.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/Slider.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Form'}</Text>
                    <Heading id="introduction" level={1}>
                        {'Slider'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Table
                    data={[
                        ['label', 'Visible field label.'],
                        ['value', 'Numeric field value.'],
                        ['description', 'Supporting field text.'],
                        ['htmlName', 'HTML form field name.'],
                        ['min', 'Minimum allowed value.'],
                        ['max', 'Maximum allowed value.'],
                        ['step', 'Increment between allowed values.'],
                        ['orientation', 'Slider orientation.'],
                        ['valueDisplay', 'How to display the value.'],
                        ['minStepsBetweenThumbs', 'Minimum increments between thumbs.'],
                        ['width', 'Control width.'],
                        ['labelTooltip', 'Tooltip for the label.'],
                        ['disabledMessage', 'Message shown when disabled.'],
                        ['status', 'Validation status.'],
                        ['statusMessage', 'Validation status message.'],
                        ['isDisabled', 'Disables the field.'],
                        ['isRequired', 'Marks the field as required.'],
                        ['isOptional', 'Marks the field as optional.'],
                        ['isLabelHidden', 'Visually hides the label.'],
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
                    code={'<Slider label="Budget" value="$form.budget" min="500" max="10000" step="500" />'}
                    language="xml"
                />
            </Stack>
        </Article>
    );
}
