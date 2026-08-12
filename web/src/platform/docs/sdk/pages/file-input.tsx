import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Form'}</Text>
            <Heading id={'file-input'} level={1}>
                {'FileInput'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Collects browser File values for form actions.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">{'Use FileInput when an Action form payload needs uploaded files.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Attributes'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'label',
                        description: 'Accessible field label.',
                        required: true,
                    },
                    {
                        name: 'value',
                        description: 'File value or writable state binding.',
                        required: true,
                    },
                    {
                        name: 'accept',
                        description: 'Accepted file extensions or MIME types.',
                    },
                    {
                        name: 'mode',
                        description: 'input or dropzone.',
                    },
                    {
                        name: 'isMultiple',
                        description: 'Allows multiple selected files.',
                    },
                ].map((attribute) => (
                    <ListItem
                        key={attribute.name}
                        label={
                            <Text>
                                <Code>{attribute.name}</Code>
                                {'required' in attribute && attribute.required ? ' required. ' : '. '}
                                {attribute.description}
                            </Text>
                        }
                    />
                ))}
            </List>
        </Stack>
        <Stack gap={3}>
            <Heading id="example" level={2}>
                Example
            </Heading>
            <CodeBlock code={'<FileInput label="Attachment" value="$form.file" accept=".pdf" />'} language="xml" />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'file-input', label: 'FileInput', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/file-input.tsx',
};
