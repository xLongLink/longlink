import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Action'}</Text>
            <Heading id={'link'} level={1}>
                {'Link'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Navigates inside a LongLink Application or opens an external URL.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">{'Use Link for destinations. Use Button for commands.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Attributes'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'to',
                        description: 'Application route destination.',
                    },
                    {
                        name: 'href',
                        description: 'URL destination.',
                    },
                    {
                        name: 'label or i18n',
                        description: 'Accessible link text.',
                    },
                    {
                        name: 'hasUnderline',
                        description: 'Shows an underline.',
                    },
                    {
                        name: 'isExternalLink',
                        description: 'Marks an external destination.',
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
                code={'<Link to="/orders/${order.id}" label="Open order" hasUnderline="true" />'}
                language="xml"
            />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'link', label: 'Link', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        { id: 'children', label: 'Children', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/link.tsx',
};
