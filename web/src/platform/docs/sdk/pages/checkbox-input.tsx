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
            <Heading id={'checkbox-input'} level={1}>
                {'CheckboxInput'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Captures one boolean value.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">
                {'Use CheckboxInput for form-submitted boolean choices such as acceptance or inclusion.'}
            </Text>
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
                        description: 'Boolean value or writable state binding.',
                        required: true,
                    },
                    {
                        name: 'isRequired, isOptional, isDisabled',
                        description: 'Explicit field states.',
                    },
                    {
                        name: 'status',
                        description: 'Validation status.',
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
            <CodeBlock code={'<CheckboxInput label="Active" value="$form.active" />'} language="xml" />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'checkbox-input', label: 'CheckboxInput', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/checkbox-input.tsx',
};
