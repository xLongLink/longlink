import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';

export const metadata = {
    path: '/docs/sdk/pages/file-input',
    title: 'FileInput',
    description:
        'FileInput provides file upload with optional drag-and-drop support. Use it for single or multiple file selection with built-in validation for file type, size, and count. Pair with validation status for upload feedback.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/pages/FileInput.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{'Form'}</Text>
                    <Heading id="introduction" level={1}>
                        {'FileInput'}
                    </Heading>
                </Stack>
                <Text as="p">{metadata.description}</Text>
                <Table
                    data={[
                        ['label', 'Visible field label.'],
                        ['value', 'Selected file value.'],
                        ['accept', 'Accepted file types.'],
                        ['description', 'Supporting field text.'],
                        ['placeholder', 'Placeholder text.'],
                        ['mode', 'File picker mode: dropzone or input.'],
                        ['maxSize', 'Maximum file size.'],
                        ['maxFiles', 'Maximum number of files.'],
                        ['width', 'Control width.'],
                        ['labelTooltip', 'Tooltip for the label.'],
                        ['disabledMessage', 'Message shown when disabled.'],
                        ['status', 'Validation status.'],
                        ['statusMessage', 'Validation status message.'],
                        ['statusVariant', 'Presentation of the status message.'],
                        ['isMultiple', 'Allows multiple files.'],
                        ['isDisabled', 'Disables the field.'],
                        ['isLoading', 'Shows a loading state.'],
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
                <CodeBlock code={'<FileInput label="Attachment" value="$form.file" accept=".pdf" />'} language="xml" />
            </Stack>
        </Article>
    );
}
