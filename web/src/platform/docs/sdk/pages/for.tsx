import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'State'}</Text>
            <Heading id={'for'} level={1}>
                {'For'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Repeats child XML for every item in an array.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">
                {'Use For when query results or state arrays should render repeated rows, cards, or controls.'}
            </Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Attributes'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'each',
                        description: 'Expression that resolves to an array.',
                        required: true,
                    },
                    {
                        name: 'as',
                        description: 'Local item variable name for each iteration.',
                        required: true,
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
            <Text as="p">{'Any rendered XML elements. Each iteration gets the item alias and index value.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="example" level={2}>
                Example
            </Heading>
            <CodeBlock
                code={
                    '<For each="$orders.items" as="order">\n  <Card>\n    <Text value="$order.number" />\n  </Card>\n</For>'
                }
                language="xml"
            />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'for', label: 'For', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        { id: 'children', label: 'Children', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/for.tsx',
};
