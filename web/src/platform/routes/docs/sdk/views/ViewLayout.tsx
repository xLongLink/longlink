import { Circle } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { useState, type ReactNode } from 'react';
import { Switch } from '@astryxdesign/core/Switch';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { componentDocumentation } from '@/platform/routes';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { Table, proportional } from '@/components/ui/Table';
import { documentationLastUpdated } from '@/lib/documentation';
import { DocumentationArticle } from '@/components/layouts/Article';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';

type ViewProperty = { name: string; type: string; description?: string };

type ViewExample = { title: string; code: string; preview: ReactNode };

/** Keeps an example's showcase mounted while switching between preview and code. */
function ExampleWindow({ example }: { example: ViewExample }) {
    const [showCode, setShowCode] = useState(false);

    // Bound both modes to the same window with a persistent header and scrollable body.
    return (
        <Card height={480} padding={0}>
            <Layout
                padding={4}
                header={
                    <LayoutHeader hasDivider padding={2} className="bg-surface">
                        <Stack direction="horizontal" hAlign="between" vAlign="center" gap={3} paddingInline={2}>
                            <Stack direction="horizontal" gap={2} aria-hidden="true" className="shrink-0">
                                <Circle size={12} fill="currentColor" className="text-(--color-window-close)" />
                                <Circle size={12} fill="currentColor" className="text-(--color-window-minimize)" />
                                <Circle size={12} fill="currentColor" className="text-(--color-window-maximize)" />
                            </Stack>
                            <Switch label="Show code" isLabelHidden value={showCode} onChange={setShowCode} size="sm" />
                        </Stack>
                    </LayoutHeader>
                }
                content={
                    <LayoutContent className="pt-6" isScrollable={!showCode}>
                        <Stack className={showCode ? 'hidden' : undefined} aria-label={`${example.title} preview`}>
                            {example.preview}
                        </Stack>
                        {showCode && (
                            <CodeBlock
                                code={example.code}
                                language="jsx"
                                hasLineNumbers
                                hasLanguageLabel={false}
                                className="h-full [&>[data-scroll-axis]]:flex-1"
                            />
                        )}
                    </LayoutContent>
                }
            />
        </Card>
    );
}

/** Provides an example and property references for an independently authored View page. */
export default function ViewLayout({
    name,
    introduction,
    properties = [],
    isLongLinkSpecific = false,
    examples = [],
    children,
    toc,
}: {
    name: string;
    introduction: string;
    properties?: ViewProperty[];
    isLongLinkSpecific?: boolean;
    examples?: ViewExample[];
    children?: ReactNode;
    toc?: { id: string; label: string; level: number }[];
}) {
    // Resolve navigation metadata for this explicit page.
    const component = componentDocumentation.find((entry) => entry.name === name);

    if (!component) throw new Error(`Missing View documentation: ${name}`);
    const runtime = component.category === 'Runtime';
    const [example] = examples;

    // Prepare property tables below the example.
    const groups = new Map<string, ViewProperty[]>();

    if (!runtime) {
        // Group the page's authored properties by component.
        for (const property of properties) {
            const separator = property.name.indexOf('.');
            const group = separator < 0 ? name : property.name.slice(0, separator);

            const row = {
                ...property,
                name: separator < 0 ? property.name : property.name.slice(separator + 1),
            };

            const properties = groups.get(group);

            if (properties) properties.push(row);
            else groups.set(group, [row]);
        }
    }

    // Preserve the existing documentation shell, region sizes, and table of contents.
    const article = {
        description: introduction,
        lastUpdated: documentationLastUpdated,
        editUrl: `https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/views/${component.label.replaceAll(' ', '')}.tsx`,
        title: `${component.label} | LongLink Documentation`,
        toc: [
            { id: 'introduction', label: 'Introduction', level: 1 },
            ...(toc ??
                (runtime
                    ? [{ id: 'reference', label: 'Reference', level: 2 }]
                    : [
                          { id: 'component-examples', label: 'Example', level: 2 },
                          { id: 'component-properties', label: 'Properties', level: 2 },
                      ])),
        ],
    };

    // Render one example followed by the property reference in the same article.
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="introduction" level={1}>
                    {component.label}
                </Heading>
                <Blockquote className="border-s-(--color-text-orange) text-(--color-text-orange)">
                    <Stack gap={0}>
                        <Text type="inherit">Beta notice: This page is being built.</Text>
                        <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                            Edit on GitHub
                        </Link>
                    </Stack>
                </Blockquote>
                <Text as="p">{introduction}</Text>
                {isLongLinkSpecific && !runtime && <Text as="p">This is a LongLink-specific component.</Text>}
                <CodeBlock
                    code={`longlink docs component "${name}"`}
                    language="bash"
                    hasLanguageLabel={false}
                    isWrapped
                />
                {runtime ? (
                    children
                ) : (
                    <Stack gap={5}>
                        <Stack as="section" gap={5} aria-labelledby="component-examples">
                            <Heading id="component-examples" level={2}>
                                Example
                            </Heading>
                            {example ? (
                                <ExampleWindow key={name} example={example} />
                            ) : (
                                <Text as="p">No standalone example is available for this component.</Text>
                            )}
                        </Stack>
                        <Stack as="section" gap={5} aria-labelledby="component-properties">
                            <Heading id="component-properties" level={2}>
                                Properties
                            </Heading>
                            {[...groups].map(([name, properties]) => (
                                <Stack key={name} gap={0}>
                                    <Table
                                        data={properties}
                                        columns={[
                                            {
                                                key: 'name',
                                                header: `${name} - Properties`,
                                                width: proportional(1),
                                                renderCell: (property) => (
                                                    <Stack gap={0}>
                                                        <Stack direction="horizontal" align="center" gap={2}>
                                                            <Text>{property.name}</Text>
                                                            <Code className="text-sm">{property.type}</Code>
                                                        </Stack>
                                                        <Text type="supporting">{property.description}</Text>
                                                    </Stack>
                                                ),
                                            },
                                        ]}
                                    />
                                </Stack>
                            ))}
                        </Stack>
                    </Stack>
                )}
            </Stack>
        </DocumentationArticle>
    );
}
