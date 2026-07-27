import { Code } from '@astryxdesign/core/Code';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { FileCode2 } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { pageElementPage } from '@/platform/docs/pages';
import { pageReferenceDocs, type ElementDoc } from './references';

const lastUpdated = '2026-07-21';
const editUrl = 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/references.ts';

/** Renders one XML element documentation article. */
function ElementReference({ element }: { element: ElementDoc }) {
    return (
        <Stack gap={5}>
            <Stack gap={2}>
                <Text type="supporting">{element.category}</Text>
                <Heading id={element.slug} level={1}>
                    {element.name}
                </Heading>
            </Stack>
            <Stack gap={3}>
                <Heading id="definition" level={2}>
                    Definition
                </Heading>
                <Text as="p">{element.summary}</Text>
            </Stack>
            <Stack gap={3}>
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <Text as="p">{element.usage}</Text>
            </Stack>
            <Stack gap={3}>
                <Heading id="attributes" level={2}>
                    {element.attributesTitle ?? 'Attributes'}
                </Heading>
                <List listStyle="disc">
                    {element.attributes.map((attribute) => (
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
            {element.children ? (
                <Stack gap={3}>
                    <Heading id="children" level={2}>
                        Children
                    </Heading>
                    <Text as="p">{element.children}</Text>
                </Stack>
            ) : null}
            <Stack gap={3}>
                <Heading id="example" level={2}>
                    Example
                </Heading>
                <CodeBlock language="xml">{element.example}</CodeBlock>
            </Stack>
        </Stack>
    );
}

/** Builds table-of-contents metadata for one element page. */
function elementMetadata(element: ElementDoc) {
    return {
        toc: [
            { id: 'definition', label: 'Definition' },
            { id: 'usage', label: 'Usage' },
            { id: 'attributes', label: 'Attributes' },
            ...(element.children ? [{ id: 'children', label: 'Children' }] : []),
            { id: 'example', label: 'Example' },
        ],
        lastUpdated,
        editUrl,
    };
}

export const pageElementDocPages = pageReferenceDocs.map((element) => ({
    ...pageElementPage(element),
    icon: <FileCode2 aria-hidden="true" size={16} />,
    content: <ElementReference element={element} />,
    metadata: elementMetadata(element),
}));

export const pageElementHrefByName = pageElementDocPages.reduce<Record<string, string>>((paths, page) => {
    paths[page.title] = page.path;
    return paths;
}, {});
