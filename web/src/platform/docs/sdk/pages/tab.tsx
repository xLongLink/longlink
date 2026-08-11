import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Layout'}</Text>
            <Heading id={'tab'} level={1}>
                {'Tab'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Defines one tab destination inside a TabList.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">{'Use Tab only as a child of TabList.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Attributes'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'value',
                        description: 'Tab value or destination.',
                        required: true,
                    },
                    {
                        name: 'label or i18n',
                        description: 'Visible tab label.',
                        required: true,
                    },
                    {
                        name: 'icon',
                        description: 'Optional icon name.',
                    },
                    {
                        name: 'href',
                        description: 'Optional route destination.',
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
            <CodeBlock code={'<Tab value="overview" label="Overview" />'} language="xml" />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'tab', label: 'Tab', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/tab.tsx',
};
