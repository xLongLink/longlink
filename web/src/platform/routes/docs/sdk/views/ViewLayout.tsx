import { Circle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { useState, type ReactNode } from 'react';
import { Switch } from '@/components/shadcn/switch';
import { InlineCode } from '@/components/shadcn/inline-code';
import { documentationLastUpdated } from '@/lib/documentation';
import { NativeText as Text } from '@/components/ui/NativeText';
import { componentDocumentation } from '@/platform/publications';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { DocumentationArticle } from '@/components/layouts/Article';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';
import { NativeCodeBlock as CodeBlock } from '@/components/ui/NativeCodeBlock';
import './viewlayout.css';
import { NativeTable as Table, proportional } from '@/components/ui/NativeTable';

type ViewProperty = { name: string; type: string; description?: string };

type ViewExample = { title: string; code: string; preview: ReactNode };

/** Keeps an example's showcase mounted while switching between preview and code. */
function ExampleWindow({ example }: { example: ViewExample }) {
    const [showCode, setShowCode] = useState(false);

    // Bound both modes to the same window with a persistent header and scrollable body.
    return (
        <Card height={480} padding={0} isClipped>
            <div className="documentation-example-window">
                <div className="documentation-example-toolbar bg-surface">
                    <Stack direction="horizontal" justify="between" align="center" gap={3} paddingInline={2}>
                        <Stack direction="horizontal" gap={2} aria-hidden="true" className="shrink-0">
                            <Circle size={12} fill="currentColor" className="text-(--color-window-close)" />
                            <Circle size={12} fill="currentColor" className="text-(--color-window-minimize)" />
                            <Circle size={12} fill="currentColor" className="text-(--color-window-maximize)" />
                        </Stack>
                        <Switch
                            size="sm"
                            aria-label="Show code"
                            checked={showCode}
                            onCheckedChange={setShowCode}
                            render={<button type="button" />}
                            nativeButton
                        />
                    </Stack>
                </div>
                <div className="documentation-example-body" data-code={showCode || undefined}>
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
                </div>
            </div>
        </Card>
    );
}

/** Provides an example and property references for an independently authored View page. */
export default function ViewLayout({
    name,
    introduction,
    properties = [],
    example,
    children,
    toc,
}: {
    name: string;
    introduction: string;
    properties?: ViewProperty[];
    example?: ViewExample;
    children?: ReactNode;
    toc?: { id: string; label: string; level: number }[];
}) {
    // Resolve navigation metadata for this explicit page.
    const component = componentDocumentation.find((entry) => entry.name === name);

    if (!component) throw new Error(`Missing View documentation: ${name}`);
    const runtime = component.category === 'Runtime';

    // Prepare property tables for the reference tab.
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
            ...(toc ?? (runtime ? [{ id: 'reference', label: 'Reference', level: 2 }] : [])),
        ],
    };

    // Render the example first and keep the property reference in a separate tab.
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="introduction" level={1}>
                    {component.label}
                </Heading>
                <Text as="p">{introduction}</Text>
                <CodeBlock
                    code={`longlink docs component ${name}`}
                    language="bash"
                    hasLanguageLabel={false}
                    isWrapped
                />
                {runtime ? (
                    children
                ) : (
                    <Tabs key={name} gap={5} hasDivider>
                        <Tab value="example" label="Example">
                            {example ? (
                                <ExampleWindow key={name} example={example} />
                            ) : (
                                <Text as="p">No standalone example is available for this component.</Text>
                            )}
                        </Tab>
                        <Tab value="properties" label="Properties">
                            {[...groups].map(([name, properties]) => (
                                <Table
                                    key={name}
                                    data={properties}
                                    density="compact"
                                    hasHover={false}
                                    isStriped={false}
                                    columns={[
                                        {
                                            key: 'name',
                                            header: `${name} - Properties`,
                                            width: proportional(1),
                                            renderCell: (property) => (
                                                <Stack gap={0}>
                                                    <Stack direction="horizontal" align="center" gap={2}>
                                                        <Text>{property.name}</Text>
                                                        <InlineCode>{property.type}</InlineCode>
                                                    </Stack>
                                                    <Text type="supporting">{property.description}</Text>
                                                </Stack>
                                            ),
                                        },
                                    ]}
                                />
                            ))}
                        </Tab>
                    </Tabs>
                )}
            </Stack>
        </DocumentationArticle>
    );
}
