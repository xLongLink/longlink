import { Card } from '@/components/shadcn/card';
import { useState, type ReactNode } from 'react';
import { Switch } from '@/components/shadcn/switch';
import { Stack } from '@/components/longlink/layout/stack';
import { InlineCode } from '@/components/shadcn/inline-code';
import { documentationLastUpdated } from '@/lib/documentation';
import { componentDocumentation } from '@/platform/publications';
import { DocumentationArticle } from '@/platform/layouts/documentation-article';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shadcn/tabs';
import viewCatalog from '../../../../../../../sdk/longlink/.static/jsx/components.json';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

type ViewProperty = { name: string; type: string; description?: string; default?: unknown };

type ViewExample = { title: string; code: string; preview: ReactNode };

/** Collapses MapLibre's attribution once, after the preview's compact control becomes available. */
function collapseMapAttribution(preview: HTMLDivElement | null) {
    if (!preview) return;

    const collapse = () => {
        const attribution = preview.querySelector<HTMLDetailsElement>(
            'details.maplibregl-ctrl-attrib.maplibregl-compact'
        );
        if (!attribution) return;

        observer.disconnect();
        attribution.open = false;
        attribution.classList.remove('maplibregl-compact-show');
    };

    const observer = new MutationObserver(collapse);
    observer.observe(preview, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    collapse();

    return () => observer.disconnect();
}

/** Keeps an example's showcase mounted while switching between preview and code. */
function ExampleWindow({ example, isMap }: { example: ViewExample; isMap: boolean }) {
    const [showCode, setShowCode] = useState(false);

    // Bound both modes to the same window with a persistent header and scrollable body.
    return (
        <Card className="py-0" style={{ height: 480 }}>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-border bg-card p-2">
                    <Stack direction="horizontal" justify="end" align="center" gap={3} paddingInline={2}>
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
                <div
                    ref={isMap ? collapseMapAttribution : undefined}
                    className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-2 data-code:overflow-hidden"
                    data-code={showCode || undefined}
                >
                    <Stack
                        gap={0}
                        className={showCode ? 'hidden' : 'my-auto shrink-0 [&_:is(h1,h2,h3,h4,h5,h6)]:mt-0!'}
                        align="center"
                        aria-label={`${example.title} preview`}
                    >
                        {example.preview}
                    </Stack>
                    {showCode && (
                        <CodeBlock
                            code={example.code}
                            language="jsx"
                            variant="ghost"
                            showLineNumbers
                            className="h-full min-h-0 [&_[data-slot=code-block-viewport]]:h-full"
                        >
                            <CodeBlockCopyButton />
                        </CodeBlock>
                    )}
                </div>
            </div>
        </Card>
    );
}

/** Provides an example and property references for an independently authored View page. */
export default function ViewLayout({
    name,
    properties,
    relatedComponents,
    example,
    children,
    toc
}: {
    name: string;
    properties?: ViewProperty[];
    relatedComponents?: readonly string[];
    example?: ViewExample;
    children?: ReactNode;
    toc?: { id: string; label: string; level: number }[];
}) {
    // Resolve navigation metadata for this explicit page.
    const component = componentDocumentation.find((entry) => entry.name === name);

    if (!component) throw new Error(`Missing View documentation: ${name}`);
    const runtime = component.category === 'Runtime';

    const references = runtime
        ? []
        : [name, ...(relatedComponents ?? [])].map((referenceName) => ({
              name: referenceName,
              component: viewCatalog.components.find((entry) => entry.name === referenceName)
          }));

    // Prepare property tables for the reference tab.
    const groups = new Map<string, ViewProperty[]>();

    for (const reference of references) {
        const referenceProperties =
            reference.component?.properties ?? (reference.name === name ? properties : undefined);
        for (const property of referenceProperties ?? []) {
            const separator = /^[A-Z]/.test(property.name) ? property.name.indexOf('.') : -1;
            const group = separator < 0 ? reference.name : property.name.slice(0, separator);

            const row = { ...property, name: separator < 0 ? property.name : property.name.slice(separator + 1) };

            const properties = groups.get(group);

            if (properties) properties.push(row);
            else groups.set(group, [row]);
        }
    }

    // Preserve the existing documentation shell, region sizes, and table of contents.
    const article = {
        description: `${component.label} examples and properties.`,
        lastUpdated: documentationLastUpdated,
        editUrl: `https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/views/${component.slug}.tsx`,
        title: `${component.label} | LongLink Documentation`,
        toc: [
            { id: 'introduction', label: 'Introduction', level: 1 },
            ...(toc ?? (runtime ? [{ id: 'reference', label: 'Reference', level: 2 }] : []))
        ]
    };

    // Render the example first and keep the property reference in a separate tab.
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="introduction">
                    {component.label}
                </h1>
                <CodeBlock
                    code={`longlink docs component ${component.category === 'Hooks' ? 'Hooks' : name}`}
                    language="bash"
                    wrap
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
                {runtime ? (
                    children
                ) : (
                    <Tabs key={name} defaultValue="example" className="gap-5">
                        <TabsList variant="line">
                            <TabsTrigger value="example">Example</TabsTrigger>
                            <TabsTrigger value="properties">Properties</TabsTrigger>
                        </TabsList>
                        <TabsContent value="example" className="flex min-w-0 flex-col gap-5">
                            {example && <ExampleWindow example={example} isMap={component.category === 'Maps'} />}
                            {!example && !children && <p>No standalone example is available for this component.</p>}
                            {children}
                        </TabsContent>
                        <TabsContent value="properties" className="flex flex-col gap-5">
                            {[...groups].map(([group, properties]) => (
                                <div key={group} className="flex flex-col gap-3">
                                    {groups.size > 1 && <h3 className="text-sm font-medium">{group}</h3>}
                                    <Table aria-label={`${group} properties`} wrap>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead scope="col">Prop</TableHead>
                                                <TableHead scope="col">Type</TableHead>
                                                <TableHead scope="col">Default</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {properties.map((row) => {
                                                const defaultValue = row.default;

                                                return (
                                                    <TableRow key={row.name}>
                                                        <TableCell>
                                                            <InlineCode className="whitespace-nowrap">
                                                                {row.name}
                                                            </InlineCode>
                                                        </TableCell>
                                                        <TableCell>
                                                            <InlineCode>{row.type}</InlineCode>
                                                        </TableCell>
                                                        <TableCell>
                                                            {defaultValue === undefined ? (
                                                                '-'
                                                            ) : (
                                                                <InlineCode className="whitespace-nowrap">
                                                                    {JSON.stringify(defaultValue)}
                                                                </InlineCode>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            ))}
                        </TabsContent>
                    </Tabs>
                )}
            </Stack>
        </DocumentationArticle>
    );
}
