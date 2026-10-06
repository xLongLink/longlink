import type { ReactNode } from 'react';
import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { useSearchParams } from 'react-router';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import references from '@/lib/generated/components.json';
import { componentDocumentation } from '@/platform/docs';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Collapsible } from '@astryxdesign/core/Collapsible';
import { documentationLastUpdated } from '@/lib/documentation';
import { Table, proportional } from '@astryxdesign/core/Table';

export type ViewReference = Pick<(typeof references)[number], 'introduction' | 'properties' | 'practices'>;
export type ViewProperties = { name: string; properties: ViewReference['properties'] }[];
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
    const propertyGroups =
        properties ?? (reference?.properties.length ? [{ name: '', properties: reference.properties }] : []);

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
        <Article page={article}>
            <Stack gap={5}>
                <Stack gap={0}>
                    <Heading id="introduction" level={1}>
                        {component.label}
                    </Heading>
                    {upstream && (
                        <Link href={upstream.url} hasUnderline>
                            Astryx documentation
                        </Link>
                    )}
                </Stack>
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
                <Collapsible key={name} trigger="Command output" defaultIsOpen={false} chevronPosition="start">
                    <CodeBlock
                        code={
                            'members' in component && component.members
                                ? `${name} [${component.category}]\n${component.members.map((member) => `- ${member.name}:\n  ${member.description}`).join('\n\n')}`
                                : `${name} [${component.category}]\nProps and types\n${component.declaration}`
                        }
                        language="plaintext"
                        hasLanguageLabel={false}
                        isWrapped
                    />
                </Collapsible>
                {runtime ? (
                    (children ?? (
                        <Stack id="reference">
                            <CodeBlock
                                code={component.declaration}
                                language="typescript"
                                title="Reference"
                                hasLanguageLabel={false}
                            />
                        </Stack>
                    ))
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
                                            <CodeBlock code={example.code} language="jsx" hasLanguageLabel={false} />
                                        </Stack>
                                    ))}
                                    {upstream && !examples.length && (
                                        <Text as="p">
                                            Astryx does not publish standalone examples for this component. See its
                                            documentation link above.
                                        </Text>
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
                                                                {property.required && (
                                                                    <Badge
                                                                        variant="blue"
                                                                        className="h-4 shrink-0 px-1"
                                                                        label={
                                                                            <Text size="xsm" color="inherit">
                                                                                Required
                                                                            </Text>
                                                                        }
                                                                    />
                                                                )}
                                                            </Stack>
                                                            <Text type="supporting">{property.description}</Text>
                                                        </Stack>
                                                    ),
                                                },
                                            ]}
                                        />
                                    </Stack>
                                ))}
                            {activeTab.value === 'best-practices' && reference && reference.practices.length > 0 && (
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
    );
}
