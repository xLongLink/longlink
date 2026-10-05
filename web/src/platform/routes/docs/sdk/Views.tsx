import { Card } from '@/components/ui/Card';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Link as RouterLink } from 'react-router';
import { ComponentPreview } from './views/Preview';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { componentDocumentation } from '@/platform/docs';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { documentationCategories } from '@/lib/documentation';

const article = {
    description: 'Build interfaces with LongLink Views and components.',
    toc: [
        { id: 'views', label: 'Views', level: 1 },
        ...documentationCategories.map((category) => ({
            id: category.toLowerCase().replace(/\W+/g, '-'),
            label: category,
            level: 2,
        })),
    ],
    lastUpdated: '2026-10-02',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/sdk/longlink/.static/jsx/frontend.d.ts',
    title: 'Views | LongLink Documentation',
};

/** Renders the native JSX catalog generated from the shared editor declarations. */
export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="views" level={1}>
                    Views
                </Heading>
                <Text as="p">
                    Create each interface as a .jsx file exporting a default React component. LongLink supplies UI
                    components, hooks such as useState() and useEffect(), fragments, queries, and scoped requests
                    directly, without imports or a React. prefix. Your Python Solution needs no frontend build.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Why?</Text>
                    <Text as="p">
                        Keeping the interface separate from the application logic makes each part easier to understand
                        and maintain.
                    </Text>
                </Stack>
                <CodeBlock
                    code={`/** @param {ViewProps} props */
export default function Item({ params }) {
  const [item] = useApi(\`/api/items/\${params.item}\`);

  return <Heading>{item.name}</Heading>;
}`}
                    language="jsx"
                    title="items/[item].jsx"
                    hasLanguageLabel={false}
                />
                {documentationCategories.map((category) => (
                    <Stack key={category} gap={3}>
                        <Heading id={category.toLowerCase().replace(/\W+/g, '-')} level={2}>
                            {category}
                        </Heading>
                        <Grid columns={{ minWidth: 190, max: 3, repeat: 'fit' }} gap={4}>
                            {componentDocumentation
                                .filter((component) => component.category === category)
                                .map((component) => (
                                    <Stack key={component.slug} className="relative" gap={2}>
                                        <Card aria-hidden="true" inert padding={3} variant="muted">
                                            <Center className="h-40 scale-90" width="100%">
                                                {component.category === 'Runtime' ? (
                                                    <Code>{component.name}</Code>
                                                ) : (
                                                    <ComponentPreview name={component.name} />
                                                )}
                                            </Center>
                                        </Card>
                                        <Text type="supporting">
                                            {component.category === 'Action' || component.category === 'Form'
                                                ? component.name.replace(/([a-z])([A-Z])/g, '$1 $2')
                                                : component.name}
                                        </Text>
                                        <RouterLink
                                            aria-label={`Open ${component.name} documentation`}
                                            className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                            to={`/docs/sdk/views/${component.slug}/`}
                                        />
                                    </Stack>
                                ))}
                        </Grid>
                    </Stack>
                ))}
            </Stack>
        </Article>
    );
}
