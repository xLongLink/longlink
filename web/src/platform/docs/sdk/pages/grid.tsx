import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { List, ListItem } from '@astryxdesign/core/List';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Layout'}</Text>
            <Heading id={'grid'} level={1}>
                {'Grid'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Creates fixed or responsive multi-column layouts.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">{'Use Grid for card galleries, dashboards, and column-based content.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Attributes'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'columns',
                        description: 'Fixed number of columns.',
                    },
                    {
                        name: 'minColumnWidth',
                        description: 'Minimum responsive column width.',
                    },
                    {
                        name: 'maxColumns',
                        description: 'Maximum responsive column count.',
                    },
                    {
                        name: 'repeat',
                        description: 'fill or fit.',
                    },
                    {
                        name: 'gap',
                        description: 'Astryx spacing value.',
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
            <Text as="p">{'Any rendered XML content.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="example" level={2}>
                Example
            </Heading>
            <CodeBlock
                code={
                    '<Grid minColumnWidth="240" maxColumns="3" repeat="fit" gap="4">\n  <Card><Text value="First" /></Card>\n  <Card><Text value="Second" /></Card>\n</Grid>'
                }
                language="xml"
            />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'grid', label: 'Grid', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        { id: 'children', label: 'Children', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/grid.tsx',
};
