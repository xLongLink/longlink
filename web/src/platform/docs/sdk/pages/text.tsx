import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Content'}</Text>
            <Heading id={'text'} level={1}>
                {'Text'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Renders paragraph, label, span, and supporting text content.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">{'Use Text for readable copy and values that are not headings.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Attributes'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'as',
                        description: 'span, p, div, or label.',
                    },
                    {
                        name: 'type',
                        description: 'body, large, label, supporting, code, display style, or inherit.',
                    },
                    {
                        name: 'label, value, or i18n',
                        description: 'Text content.',
                    },
                    {
                        name: 'values',
                        description: 'Translation interpolation values.',
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
            <Text as="p">{'Optional text content.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="example" level={2}>
                Example
            </Heading>
            <CodeBlock
                code={'<Text as="p" i18n="orders.summary" values="${{ number: order.number }}" />'}
                language="xml"
            />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'text', label: 'Text', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        { id: 'children', label: 'Children', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/text.tsx',
};
