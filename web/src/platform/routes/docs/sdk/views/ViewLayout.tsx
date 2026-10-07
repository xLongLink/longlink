import type { ReactNode } from 'react';
import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { useSearchParams } from 'react-router';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import references from '@/lib/generated/components.json';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Seo, articleRouteLabels } from '@/components/Seo';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { documentationLastUpdated } from '@/lib/documentation';
import { Table, proportional } from '@astryxdesign/core/Table';
import { componentDocumentation, documentationPaths } from '@/platform/docs';
import { ArticleFooter, ArticleOutline } from '@/platform/components/Article';

export type ViewProperties = {
    name: string;
    properties: {
        name: string;
        type: string;
        required?: boolean;
        description: string;
    }[];
}[];
export type ViewReference = Pick<(typeof references)[number], 'introduction' | 'practices'> & {
    properties?: ViewProperties[number]['properties'];
};
export type ViewExample = { title: string; code: string; preview: ReactNode };

const tabs = [
    { value: 'examples', label: 'Examples' },
    { value: 'properties', label: 'Properties' },
    { value: 'best-practices', label: 'Best practices' },
];

/** Provides the article shell and reference tabs for an independently authored View page. */
export default function ViewLayout({
    name,
    reference: authoredReference,
    examples = [],
    properties,
    children,
    toc,
}: {
    name: string;
    reference?: ViewReference;
    examples?: ViewExample[];
    properties?: ViewProperties;
    children?: ReactNode;
    toc?: { id: string; label: string; level: number }[];
}) {
    const [searchParams, setSearchParams] = useSearchParams();

    // Resolve the declaration catalog and optional generated reference for this explicit page.
    const component = componentDocumentation.find((entry) => entry.name === name);
    if (!component) throw new Error(`Missing View documentation: ${name}`);
    const upstream = references.find((entry) => entry.name === name);
    const reference = authoredReference ?? upstream;
    const activeTab = tabs.find((tab) => tab.value === searchParams.get('tab')) ?? tabs[0];
    const runtime = component.category === 'Runtime';

    // Authored tables take precedence; generated tables omit grouped subcomponent rows.
    const componentProperties =
        authoredReference?.properties ??
        component.properties
            ?.filter((property) => !property.name.includes('.'))
            .map((property) => ({ ...property, description: property.description ?? '' })) ??
        [];
    const propertyGroups =
        properties ?? (componentProperties.length ? [{ name: '', properties: componentProperties }] : []);

    // Preserve the existing documentation shell, region sizes, and table of contents.
    const article = {
        description: reference?.introduction ?? `${name} in LongLink Views.`,
        lastUpdated: documentationLastUpdated,
        editUrl: `https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/views/${component.label.replaceAll(' ', '')}.tsx`,
        title: `${component.label} | LongLink Documentation`,
        toc: [
            { id: 'introduction', label: 'Introduction', level: 1 },
            ...(toc ?? [
                {
                    id: runtime ? 'reference' : `component-${activeTab.value}`,
                    label: runtime ? 'Reference' : activeTab.label,
                    level: 2,
                },
            ]),
        ],
    };

    // Render page-owned content within the existing article and reference-tab structure.
    return (
        <>
            <Seo description={article.description} hasBreadcrumbs title={article.title} />
            <Article
                className="documentation-content [--font-family-heading:var(--font-family-handwritten)] [&_.astryx-heading]:uppercase [&_.astryx-heading]:tracking-wide"
                header={<PathBreadcrumb className="min-w-0 overflow-hidden" labels={articleRouteLabels} />}
                headerAction={<Button href="/login/" label="Get Started" size="sm" variant="primary" />}
                footer={
                    <ArticleFooter
                        lastUpdated={article.lastUpdated}
                        editUrl={article.editUrl}
                        paths={documentationPaths}
                    />
                }
                sidebar={article.toc.length ? <ArticleOutline items={article.toc} /> : undefined}
            >
                <Stack gap={5}>
                    <Heading id="introduction" level={1}>
                        {component.label}
                    </Heading>
                    <Text as="p">
                        {reference?.introduction ?? `${name} is supplied by the isolated LongLink renderer.`}
                    </Text>
                    {authoredReference && !runtime && <Text as="p">This is a LongLink-specific component.</Text>}
                    <CodeBlock
                        code={`longlink docs --component "${name}"`}
                        language="bash"
                        hasLanguageLabel={false}
                        isWrapped
                    />
                    {runtime ? (
                        children
                    ) : (
                        <Stack gap={5}>
                            <TabList
                                role="tablist"
                                value={activeTab.value}
                                onChange={(value) => {
                                    // Preserve other query parameters while making each tab linkable.
                                    const params = new URLSearchParams(searchParams);
                                    params.set('tab', value);
                                    setSearchParams(params, { preventScrollReset: true });
                                }}
                                hasDivider
                            >
                                {tabs.map((tab) => (
                                    <Tab
                                        key={tab.value}
                                        value={tab.value}
                                        label={tab.label}
                                        panelId={`component-${tab.value}`}
                                    />
                                ))}
                            </TabList>
                            {/* Mount only the URL-selected panel, without parsing Solution View JSX markers. */}
                            <Stack
                                id={`component-${activeTab.value}`}
                                role="tabpanel"
                                tabIndex={0}
                                aria-label={activeTab.label}
                                gap={5}
                            >
                                {activeTab.value === 'examples' && (
                                    <>
                                        {examples.map((example) => (
                                            <Stack key={example.title} gap={3}>
                                                <Stack
                                                    padding={4}
                                                    className="overflow-auto rounded-lg border border-border"
                                                    aria-label={`${example.title} preview`}
                                                >
                                                    {example.preview}
                                                </Stack>
                                                <CodeBlock
                                                    code={example.code}
                                                    language="jsx"
                                                    hasLanguageLabel={false}
                                                />
                                            </Stack>
                                        ))}
                                        {upstream && !examples.length && (
                                            <Text as="p">No standalone examples are available for this component.</Text>
                                        )}
                                    </>
                                )}
                                {activeTab.value === 'properties' &&
                                    propertyGroups.map((group) => (
                                        <Stack key={group.name} gap={3}>
                                            {group.name && <Heading level={2}>{group.name}</Heading>}
                                            <Table
                                                data={group.properties}
                                                idKey="name"
                                                density="compact"
                                                columns={[
                                                    {
                                                        key: 'name',
                                                        header: 'Property',
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
                                {activeTab.value === 'best-practices' &&
                                    reference &&
                                    reference.practices.length > 0 && (
                                        <Table
                                            data={reference.practices}
                                            idKey="description"
                                            density="compact"
                                            columns={[
                                                {
                                                    key: 'guidance',
                                                    header: 'Guidance',
                                                    width: proportional(1),
                                                    renderCell: (practice) => (
                                                        <Badge
                                                            label={practice.guidance ? 'Do' : 'Don’t'}
                                                            variant={practice.guidance ? 'green' : 'red'}
                                                        />
                                                    ),
                                                },
                                                {
                                                    key: 'description',
                                                    header: 'Description',
                                                    width: proportional(4),
                                                    renderCell: (practice) => (
                                                        <Text type="supporting">{practice.description}</Text>
                                                    ),
                                                },
                                            ]}
                                        />
                                    )}
                            </Stack>
                        </Stack>
                    )}
                </Stack>
            </Article>
        </>
    );
}
