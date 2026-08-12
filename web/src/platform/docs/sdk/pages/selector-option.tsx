import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { List, ListItem } from '@astryxdesign/core/List';

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{'Form'}</Text>
            <Heading id={'selector-option'} level={1}>
                {'SelectorOption'}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{'Defines one option inside a Selector.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">{'Use SelectorOption only as a direct child of Selector.'}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {'Attributes'}
            </Heading>
            <List listStyle="disc">
                {[
                    {
                        name: 'value',
                        description: 'Selected option value.',
                        required: true,
                    },
                    {
                        name: 'label',
                        description: 'Visible option text.',
                    },
                    {
                        name: 'isDisabled',
                        description: 'Disables this option.',
                    },
                    {
                        name: 'if',
                        description: 'Optional expression that controls whether the option exists.',
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
            <CodeBlock code={'<SelectorOption value="open" label="Open" />'} language="xml" />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: 'selector-option', label: 'SelectorOption', level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/pages/selector-option.tsx',
};
