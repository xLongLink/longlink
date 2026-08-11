import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import type { PageReferenceCatalog } from './catalog';

export const catalog: PageReferenceCatalog = {
    name: 'count',
    slug: 'count',
    category: 'Runtime',
    summary: 'Passes a numeric count through values into an ICU plural translation.',
    usage: 'Use values.count with i18n messages that contain plural branches.',
    attributesTitle: 'Rules',
    attributes: [
        {
            name: 'values.count',
            description: 'Numeric interpolation value used by ICU plural selection.',
            required: true,
        },
    ],
    example: '<Text i18n="orders.count" values="${{ count: orders.items.length }}" />',
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
        { id: 'attributes', label: catalog.attributesTitle ?? 'Attributes', level: 2 },
        ...(catalog.children ? [{ id: 'children', label: 'Children', level: 2 }] : []),
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references/count.tsx',
};
