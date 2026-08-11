import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Runtime'}</Text>
            <Heading id={'expressions'} level={1}>
                {'Expressions'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Evaluates a safe JavaScript expression subset against the XML runtime scope.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">
                {'Use expressions for conditions, derived values, request payloads, query paths, and bindings.'}
            </Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Rules'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: '$path',
                        description: 'Reads a runtime value and creates writable control bindings.',
                    },
                    {
                        name: '${...}',
                        description: 'Evaluates a typed expression when the entire value is wrapped.',
                    },
                    {
                        name: 'mixed interpolation',
                        description: 'Interpolates ${...} segments into a string value.',
                    },
                    {
                        name: 'allowed calls',
                        description: 'Boolean, Number, String, Array.isArray, and selected Math helpers are allowed.',
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
            <CodeBlock
                code={
                    '<TextInput label="Name" value="$form.name" />\n<Button isDisabled="${!form.name || form.saving}" label="Save" />\n<Link to="/orders/${params.order}" label="Open order" />'
                }
                language="xml"
            />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'expressions', label: 'Expressions', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Rules', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/expressions.tsx',
};
