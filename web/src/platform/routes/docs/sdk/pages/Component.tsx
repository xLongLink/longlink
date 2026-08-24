import { useParams } from 'react-router';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { proportional, Table } from '@astryxdesign/core/Table';
import { componentDocumentation, type ComponentDocumentation } from '@/lib/xsd';

function AttributeTable({ attributes }: { attributes: ComponentDocumentation['attributes'] }) {
    return (
        <Table
            data={attributes.map(({ description, name }) => ({ description, parameter: name }))}
            columns={[
                { key: 'parameter', header: 'Parameter', width: proportional(1) },
                { key: 'description', header: 'Description', width: proportional(3) },
            ]}
            density="compact"
            dividers="rows"
        />
    );
}

/** Renders XSD component documentation from the schema bundled by Vite. */
export default function DocsArticleRoute() {
    const { component: slug } = useParams();
    const component = componentDocumentation.find((candidate) => candidate.slug === slug);

    if (!component) {
        throw new Response('Not found', { status: 404 });
    }

    const metadata = {
        lastUpdated: component.lastUpdated,
        toc: [
            { id: 'introduction', label: 'Introduction', level: 1 },
            { id: 'usage', label: 'Usage', level: 2 },
            ...component.nested.map((nested) => ({ id: nested.name.toLowerCase(), label: nested.name, level: 2 })),
        ],
        editUrl: `https://github.com/xLongLink/longlink/edit/main/sdk/longlink/.static/xsd/${component.source}`,
    };

    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Stack gap={2}>
                    <Text type="supporting">{component.category}</Text>
                    <Heading id="introduction" level={1}>
                        {component.name}
                    </Heading>
                </Stack>
                <Text as="p">{component.description}</Text>
                <AttributeTable attributes={component.attributes} />
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock code={component.example} language="xml" />
                {component.nested.map((nested) => (
                    <Stack key={nested.name} gap={3}>
                        <Heading id={nested.name.toLowerCase()} level={2}>
                            {nested.name}
                        </Heading>
                        <Text as="p">{nested.description}</Text>
                        <AttributeTable attributes={nested.attributes} />
                        {nested.example ? <CodeBlock code={nested.example} language="xml" /> : null}
                    </Stack>
                ))}
            </Stack>
        </Article>
    );
}
