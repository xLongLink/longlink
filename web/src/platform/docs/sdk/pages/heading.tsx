import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { List, ListItem } from '@astryxdesign/core/List';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Content'}</Text>
            <Heading id={'heading'} level={1}>
                {'Heading'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Creates semantic section headings.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">{'Use Heading to structure XML pages with explicit document hierarchy.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Attributes'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'level',
                        description: 'Heading level from 1 to 6.',
                        required: true,
                    },
                    {
                        name: 'type',
                        description: 'Optional display-1, display-2, or display-3 visual scale.',
                    },
                    {
                        name: 'accessibilityLevel',
                        description: 'Optional semantic heading level from 1 to 6.',
                    },
                    {
                        name: 'color, display, justify',
                        description: 'Visual color, layout, and alignment properties from Astryx Heading.',
                    },
                    {
                        name: 'maxLines, hasTruncateTooltip, wordBreak, textWrap',
                        description: 'Truncation and wrapping properties from Astryx Heading.',
                    },
                    {
                        name: 'hasCapsize, hasStrikethrough, id',
                        description: 'Optical alignment, decoration, and HTML identifier properties.',
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
            <Text as="p">{'Nested XML content is rendered as the heading.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="example" level={2}>
                Example
            </Heading>
            <CodeBlock code={'<Heading level="1">Orders</Heading>'} language="xml" />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'heading', label: 'Heading', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        { id: 'children', label: 'Children', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/heading.tsx',
};
