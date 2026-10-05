import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import references from '@/lib/generated/components.json';
import { componentDocumentation } from '@/platform/docs';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { useParams, useSearchParams } from 'react-router';
import NotFoundLayout from '@/components/layouts/NotFound';
import { documentationLastUpdated } from '@/lib/documentation';
import { Table, proportional } from '@astryxdesign/core/Table';

const tabs = [
    { value: 'examples', label: 'Examples' },
    { value: 'anatomy', label: 'Anatomy' },
    { value: 'properties', label: 'Properties' },
    { value: 'best-practices', label: 'Best practices' },
];

// Document only the React bindings exposed by the isolated View runtime.
const reactFunctions = [
    {
        name: 'createElement(type, props, ...children)',
        description: 'Creates a React element. Prefer JSX, which calls this function automatically.',
    },
    {
        name: 'useState(initial)',
        description:
            'Returns the current state and a setter. Pass a value or an initializer function; updates can use the previous state.',
    },
    {
        name: 'useEffect(effect, dependencies)',
        description:
            'Synchronizes with external systems after rendering. Return a cleanup function to release timers or subscriptions. Include every reactive value used by the effect in its dependencies.',
    },
    {
        name: 'useMemo(factory, dependencies)',
        description:
            'Caches a calculated value until its dependencies change. Use it for expensive calculations, not required application state.',
    },
    {
        name: 'useRef(initial)',
        description:
            'Returns a stable object with a mutable current property. Changing current does not trigger a render.',
    },
];

const reactIntroduction =
    'LongLink supplies these React functions directly in Views, without imports or a React. prefix. Call hooks at the top level of a component, never inside conditions or loops.';

const reactExample = `export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <Stack gap={3}>
      <Text>Count: {count}</Text>
      <Button
        label="Increment"
        onClick={() => setCount((previous) => previous + 1)}
      />
    </Stack>
  );
}`;

// LongLink-only components have no equivalent Astryx reference or upstream examples.
const solutionReferences: Record<
    string,
    Pick<(typeof references)[number], 'introduction' | 'examples' | 'anatomy' | 'properties' | 'practices'>
> = {
    Currency: {
        introduction: 'Currency formats a numeric value with the browser’s locale-aware currency formatter.',
        examples: [{ title: 'Currency', description: '', code: '<Currency value={1234.5} currency="USD" />' }],
        anatomy: [
            {
                name: 'Currency',
                required: false,
                description: 'The formatted amount is rendered as text, without an additional wrapper.',
            },
        ],
        properties: [],
        practices: [
            {
                guidance: true,
                description:
                    'Pass a numeric value and a valid currency code. Set locale when a specific regional format is required.',
            },
        ],
    },
    FileViewer: {
        introduction: 'FileViewer opens an image attachment preview through the scoped Solution API.',
        examples: [
            {
                title: 'FileViewer',
                description: '',
                code: '<FileViewer src="/api/items/123/image" title="View image" />',
            },
        ],
        anatomy: [
            {
                name: 'FileViewer',
                required: false,
                description:
                    'A button toggles the preview. The preview displays a loading, ready, or unavailable state.',
            },
        ],
        properties: [],
        practices: [
            {
                guidance: true,
                description:
                    'Use a descriptive title and an image endpoint in your Solution. Other file types cannot be previewed.',
            },
        ],
    },
    Menu: {
        introduction: 'Menu combines Astryx SideNav with the selected section’s content.',
        examples: [
            {
                title: 'Menu',
                description: '',
                code: '<Menu sections={[{ title: "Settings", entries: [{ kind: "item", id: "profile", label: "Profile", content: <Text>Profile settings</Text> }] }]} />',
            },
        ],
        anatomy: [
            {
                name: 'Menu',
                required: false,
                description:
                    'Sections contain navigation items or nested subsections. The selected item’s content appears beside the navigation.',
            },
        ],
        properties: [],
        practices: [
            {
                guidance: true,
                description:
                    'Give each item a stable, unique id and a descriptive label. The URL hash identifies the selected item.',
            },
        ],
    },
};

/** Presents generated Astryx references alongside the LongLink-specific View contract. */
export default function DocsArticleRoute() {
    const { component: slug } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    // Resolve the catalog entry before accessing its generated reference.
    const component = componentDocumentation.find((candidate) => candidate.slug === slug);
    if (!component) return <NotFoundLayout />;
    const upstream = references.find((candidate) => candidate.name === component.name);
    const solution = solutionReferences[component.name];
    const reference = upstream ?? solution;
    const requestedTab = searchParams.get('tab');
    const activeTab = tabs.find((candidate) => candidate.value === requestedTab) ?? tabs[0];
    const tab = activeTab.value;
    const runtime = component.category === 'Runtime';
    const react = component.name === 'React';

    // Link only to content rendered in the active tab.
    const toc = [
        { id: 'introduction', label: 'Introduction', level: 1 },
        ...(react
            ? [
                  { id: 'functions', label: 'Functions', level: 2 },
                  { id: 'example', label: 'Example usage', level: 2 },
              ]
            : [
                  {
                      id: runtime ? 'reference' : `component-${tab}`,
                      label: runtime ? 'Reference' : activeTab.label,
                      level: 2,
                  },
              ]),
    ];
    const article = {
        description: react ? reactIntroduction : (reference?.introduction ?? `${component.name} in LongLink Views.`),
        lastUpdated: documentationLastUpdated,
        editUrl: 'https://github.com/xLongLink/longlink/edit/main/sdk/longlink/.static/jsx/frontend.d.ts',
        title: `${component.name} | LongLink Documentation`,
        toc,
    };

    return (
        <Article page={article}>
            <Stack gap={5}>
                <Stack gap={0}>
                    <Heading id="introduction" level={1}>
                        {component.name}
                    </Heading>
                    {upstream && (
                        <Link href={upstream.url} hasUnderline>
                            Astryx documentation
                        </Link>
                    )}
                    {component.name === 'Menu' && (
                        <Link href="https://astryx.atmeta.com/components/SideNav" hasUnderline>
                            Astryx SideNav documentation
                        </Link>
                    )}
                </Stack>
                <Text as="p">
                    {react
                        ? reactIntroduction
                        : (reference?.introduction ??
                          `${component.name} is supplied by the isolated LongLink renderer.`)}
                </Text>
                {solution && <Text as="p">This is a LongLink-specific component.</Text>}
                <CodeBlock
                    code={`longlink docs --component "${component.name}"`}
                    language="bash"
                    hasLanguageLabel={false}
                    isWrapped
                />
                {react ? (
                    <>
                        <Heading id="functions" level={2}>
                            Functions
                        </Heading>
                        <Table
                            data={reactFunctions}
                            idKey="name"
                            density="compact"
                            columns={[
                                { key: 'name', header: 'Function', width: proportional(2) },
                                { key: 'description', header: 'Usage', width: proportional(3) },
                            ]}
                        />
                        <Text as="p">
                            Fragment groups children without adding a DOM wrapper. Use the JSX shorthand
                            &lt;&gt;…&lt;/&gt; or &lt;Fragment key=&#123;id&#125;&gt;…&lt;/Fragment&gt; when a key is
                            needed.
                        </Text>
                        <Heading id="example" level={2}>
                            Example usage
                        </Heading>
                        <Text as="p">
                            This View stores a counter in local state. The setter receives the previous value so each
                            click increments it safely.
                        </Text>
                        <CodeBlock code={reactExample} language="jsx" title="counter.jsx" hasLanguageLabel={false} />
                    </>
                ) : runtime ? (
                    <Stack id="reference">
                        <CodeBlock
                            code={component.declaration}
                            language="typescript"
                            title="Reference"
                            hasLanguageLabel={false}
                        />
                    </Stack>
                ) : (
                    <>
                        <TabList
                            value={tab}
                            onChange={(value) => {
                                // Preserve other query parameters while making each tab linkable.
                                const params = new URLSearchParams(searchParams);
                                params.set('tab', value);
                                setSearchParams(params, { preventScrollReset: true });
                            }}
                            role="tablist"
                            hasDivider
                        >
                            {tabs.map((item) => (
                                <Tab
                                    key={item.value}
                                    value={item.value}
                                    label={item.label}
                                    panelId={`component-${item.value}`}
                                />
                            ))}
                        </TabList>
                        <Stack
                            id={`component-${tab}`}
                            role="tabpanel"
                            tabIndex={0}
                            aria-label={activeTab.label}
                            gap={5}
                        >
                            {tab === 'examples' && (
                                <>
                                    {reference?.examples.map((example) => (
                                        <CodeBlock
                                            key={example.title}
                                            code={example.code}
                                            language={upstream ? 'tsx' : 'jsx'}
                                            hasLanguageLabel={false}
                                        />
                                    ))}
                                    {upstream && !reference?.examples.length && (
                                        <Text as="p">
                                            Astryx does not publish standalone examples for this component. See its
                                            documentation link above.
                                        </Text>
                                    )}
                                </>
                            )}
                            {tab === 'anatomy' &&
                                reference &&
                                (upstream ? (
                                    reference.anatomy.length ? (
                                        <Table
                                            data={reference.anatomy}
                                            idKey="name"
                                            density="compact"
                                            columns={[
                                                {
                                                    key: 'name',
                                                    header: 'Element',
                                                    width: proportional(1),
                                                    renderCell: (item) => (
                                                        <Stack gap={0}>
                                                            <Stack direction="horizontal" align="center" gap={2}>
                                                                <Text>{item.name}</Text>
                                                                {item.required && (
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
                                                            <Text type="supporting">{item.description}</Text>
                                                        </Stack>
                                                    ),
                                                },
                                            ]}
                                        />
                                    ) : (
                                        <Text as="p">Astryx does not publish anatomy guidance for this component.</Text>
                                    )
                                ) : (
                                    reference.anatomy.map((item) => (
                                        <Text key={item.name} as="p">
                                            {item.description}
                                        </Text>
                                    ))
                                ))}
                            {tab === 'properties' && upstream && reference && (
                                <Table
                                    data={reference.properties}
                                    idKey="name"
                                    density="compact"
                                    columns={[
                                        {
                                            key: 'name',
                                            header: 'Property',
                                            width: proportional(1),
                                            renderCell: (item) => (
                                                <Stack gap={0}>
                                                    <Stack direction="horizontal" align="center" gap={2}>
                                                        <Text>{item.name}</Text>
                                                        <Code className="text-sm">{item.type}</Code>
                                                        {item.required && (
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
                                                    <Text type="supporting">{item.description}</Text>
                                                </Stack>
                                            ),
                                        },
                                    ]}
                                />
                            )}
                            {tab === 'best-practices' && (
                                <>
                                    {reference && reference.practices.length > 0 && (
                                        <Table
                                            data={reference.practices}
                                            idKey="description"
                                            density="compact"
                                            columns={[
                                                {
                                                    key: 'guidance',
                                                    header: 'Guidance',
                                                    width: proportional(1),
                                                    renderCell: (item) => (
                                                        <Badge
                                                            label={item.guidance ? 'Do' : 'Don’t'}
                                                            variant={item.guidance ? 'green' : 'red'}
                                                        />
                                                    ),
                                                },
                                                {
                                                    key: 'description',
                                                    header: 'Description',
                                                    width: proportional(4),
                                                    renderCell: (item) => (
                                                        <Text type="supporting">{item.description}</Text>
                                                    ),
                                                },
                                            ]}
                                        />
                                    )}
                                    {upstream && !reference?.practices.length && (
                                        <Text as="p">Astryx does not publish best practices for this component.</Text>
                                    )}
                                </>
                            )}
                        </Stack>
                    </>
                )}
            </Stack>
        </Article>
    );
}
