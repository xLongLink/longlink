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
            <Heading id={'i18n'} level={1}>
                {'Translations'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Looks up visible copy from the active XML translation catalog.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">{'Use i18n on text-bearing elements instead of hardcoding visible copy in page XML.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Rules'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'i18n',
                        description: 'Literal dotted translation key such as orders.title. It is not an expression.',
                        required: true,
                    },
                    {
                        name: 'values',
                        description: 'Optional expression object for ICU message interpolation.',
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
                    '<Heading level="1" i18n="orders.title" />\n<Text as="p" i18n="orders.summary" values="${{ customer: order.customer, count: orders.length }}" />'
                }
                language="xml"
            />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'i18n', label: 'Translations', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Rules', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/i18n.tsx',
};
