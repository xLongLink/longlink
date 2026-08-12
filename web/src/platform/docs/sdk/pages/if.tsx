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
            <Heading id={'if'} level={1}>
                {'if'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Conditionally renders an XML node when its expression evaluates to a truthy value.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">
                {'Add if to rendered XML nodes and adapter-consumed child nodes that should appear only in one state.'}
            </Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Rules'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'if',
                        description: 'Expression evaluated against the current XML runtime scope.',
                        required: true,
                    },
                    {
                        name: 'scope',
                        description: 'Can read State, Query, params, and loop aliases available at the node position.',
                    },
                    {
                        name: 'result',
                        description: 'Falsy results skip the node and its children; truthy results render normally.',
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
                    '<Badge if="${order.blocked}" variant="error" label="Blocked" />\n\n<Selector label="Status" value="$filters.status">\n  <SelectorOption value="open" label="Open" />\n  <SelectorOption if="${user.canClose}" value="closed" label="Closed" />\n</Selector>'
                }
                language="xml"
            />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'if', label: 'if', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Rules', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/if.tsx',
};
