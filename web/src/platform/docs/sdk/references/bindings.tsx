import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import type { PageReferenceCatalog } from './catalog';

export const catalog: PageReferenceCatalog = {
    name: 'Bindings',
    slug: 'bindings',
    category: 'Runtime',
    summary: 'Connects writable control values to State objects declared in the XML runtime.',
    usage: 'Use bindings when form controls need to edit local page state before an Action sends data.',
    attributesTitle: 'Rules',
    attributes: [
        {
            name: 'value="$state.path"',
            description: 'Binds a control value to a State object field.',
            required: true,
        },
        {
            name: 'safe names',
            description: 'State ids and path segments must be safe property names.',
        },
        {
            name: 'unbound values',
            description: 'Literal and computed values render as local control state only.',
        },
    ],
    example:
        '<State id="form" name="" active="true" />\n\n<TextInput label="Name" value="$form.name" />\n<Switch label="Active" value="$form.active" />',
};

export const content = (
    <Stack gap={5}>
        <Stack gap={2}>
            <Text type="supporting">{catalog.category}</Text>
            <Heading id={catalog.slug} level={1}>
                {catalog.name}
            </Heading>
        </Stack>
        <Stack gap={3}>
            <Heading id="definition" level={2}>
                Definition
            </Heading>
            <Text as="p">{catalog.summary}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <Text as="p">{catalog.usage}</Text>
        </Stack>
        <Stack gap={3}>
            <Heading id="attributes" level={2}>
                {catalog.attributesTitle ?? 'Attributes'}
            </Heading>
            <List listStyle="disc">
                {catalog.attributes.map((attribute) => (
                    <ListItem
                        key={attribute.name}
                        label={
                            <Text>
                                <Code>{attribute.name}</Code>
                                {attribute.required ? ' required. ' : '. '}
                                {attribute.description}
                            </Text>
                        }
                    />
                ))}
            </List>
        </Stack>
        {catalog.children ? (
            <Stack gap={3}>
                <Heading id="children" level={2}>
                    Children
                </Heading>
                <Text as="p">{catalog.children}</Text>
            </Stack>
        ) : null}
        <Stack gap={3}>
            <Heading id="example" level={2}>
                Example
            </Heading>
            <CodeBlock code={catalog.example} language="xml" />
        </Stack>
    </Stack>
);

export const metadata = {
    toc: [
        { id: catalog.slug, label: catalog.name, level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Rules', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/bindings.tsx',
};
