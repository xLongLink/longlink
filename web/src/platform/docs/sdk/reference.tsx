import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

type ReferenceAttribute = {
    name: string;
    description: string;
    required?: boolean;
};

export type ReferenceDoc = {
    name: string;
    slug: string;
    category: string;
    summary: string;
    usage: string;
    example: string;
    attributes: ReferenceAttribute[];
    attributesTitle?: string;
    children?: string;
};

/** Builds the table of contents for one SDK reference article. */
export function referenceToc(reference: ReferenceDoc) {
    return [
        { id: reference.slug, label: reference.name, level: 1 },
        { id: 'definition', label: 'Definition', level: 2 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'attributes', label: 'Attributes', level: 2 },
        ...(reference.children ? [{ id: 'children', label: 'Children', level: 2 }] : []),
        { id: 'example', label: 'Example', level: 2 },
    ];
}

/** Renders the shared layout for one SDK reference article. */
export function ReferenceArticle({ reference }: { reference: ReferenceDoc }) {
    return (
        <Stack gap={5}>
            <Stack gap={2}>
                <Text type="supporting">{reference.category}</Text>
                <Heading id={reference.slug} level={1}>
                    {reference.name}
                </Heading>
            </Stack>
            <Stack gap={3}>
                <Heading id="definition" level={2}>
                    Definition
                </Heading>
                <Text as="p">{reference.summary}</Text>
            </Stack>
            <Stack gap={3}>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <Text as="p">{reference.usage}</Text>
            </Stack>
            <Stack gap={3}>
                <Heading id="attributes" level={2}>
                    {reference.attributesTitle ?? 'Attributes'}
                </Heading>
                <List listStyle="disc">
                    {reference.attributes.map((attribute) => (
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
            {reference.children ? (
                <Stack gap={3}>
                    <Heading id="children" level={2}>
                        Children
                    </Heading>
                    <Text as="p">{reference.children}</Text>
                </Stack>
            ) : null}
            <Stack gap={3}>
                <Heading id="example" level={2}>
                    Example
                </Heading>
                <CodeBlock code={reference.example} language="xml" />
            </Stack>
        </Stack>
    );
}
