import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { List, ListItem } from '@astryxdesign/core/List';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'State'}</Text>
            <Heading id={'state'} level={1}>
                {'State'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Declares local reactive page state before the page renders.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">{'Use State near the top of the page when controls need writable local values.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Attributes'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'id',
                        description: 'Literal state name exposed in XML expressions.',
                        required: true,
                    },
                    {
                        name: 'additional attributes',
                        description:
                            'Initial state fields. JSON values are parsed first, otherwise the value is evaluated.',
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
            <Heading id="children" level={2}>
                Children
            </Heading>
            <Text as="p">{'State is setup-only and cannot have children.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="example" level={2}>
                Example
            </Heading>
            <CodeBlock
                code={'<State id="form" name="" active="true" />\n\n<TextInput label="Name" value="$form.name" />'}
                language="xml"
            />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'state', label: 'State', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        { id: 'children', label: 'Children', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/state.tsx',
};
