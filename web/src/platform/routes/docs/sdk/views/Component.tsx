import { useParams } from 'react-router';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import NotFoundLayout from '@/components/layouts/NotFound';
import { proportional, Table } from '@astryxdesign/core/Table';
import { componentDocumentation, type ComponentDocumentation } from '@/lib/generated/documentation';

function AttributeTable({ attributes }: { attributes: ComponentDocumentation['attributes'] }) {
    return (
        <Table
            data={attributes}
            columns={[
                { key: 'name', header: 'Parameter', width: proportional(1) },
                { key: 'description', header: 'Description', width: proportional(3) },
            ]}
            density="compact"
        />
    );
}

/** Renders component documentation generated from the SDK XSD schema. */
export default function DocsArticleRoute() {
    const { component: slug } = useParams();
    const component = componentDocumentation.find((candidate) => candidate.slug === slug);

    if (!component) {
        return <NotFoundLayout />;
    }

    const article = {
        description: component.description,
        lastUpdated: component.lastUpdated,
        toc: [
            { id: 'introduction', label: 'Introduction', level: 1 },
            { id: 'example', label: 'Example', level: 2 },
            ...component.nested.map((nested) => ({ id: nested.name.toLowerCase(), label: nested.name, level: 2 })),
            { id: 'cli', label: 'Cli', level: 2 },
        ],
        editUrl: `https://github.com/xLongLink/longlink/edit/main/sdk/longlink/.static/xsd/${component.source}`,
        title: `${component.name} | LongLink Documentation`,
    };

    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="introduction" level={1}>
                    {component.name}
                </Heading>
                <Text as="p">{component.description}</Text>
                {component.attributes.length > 0 ? <AttributeTable attributes={component.attributes} /> : null}
                <Heading id="example" level={2}>
                    Example
                </Heading>
                <CodeBlock code={component.example} language="xml" title="example.view" hasLanguageLabel={false} />
                {component.nested.map((nested) => (
                    <Stack key={nested.name} gap={3}>
                        <Heading id={nested.name.toLowerCase()} level={2}>
                            {nested.name}
                        </Heading>
                        <Text as="p">{nested.description}</Text>
                        {nested.attributes.length > 0 ? <AttributeTable attributes={nested.attributes} /> : null}
                        {nested.example ? (
                            <CodeBlock
                                code={nested.example}
                                language="xml"
                                title="example.view"
                                hasLanguageLabel={false}
                            />
                        ) : null}
                    </Stack>
                ))}
                <Heading id="cli" level={2}>
                    Cli
                </Heading>
                <CodeBlock
                    code={`longlink docs ui --component ${component.name}`}
                    language="bash"
                    hasLanguageLabel={false}
                    isWrapped
                />
            </Stack>
        </Article>
    );
}
