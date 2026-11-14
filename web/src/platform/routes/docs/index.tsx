import { Link } from 'react-router';
import { Grid } from '@/components/custom/grid';
import { Code2, Lightbulb, ServerCog } from 'lucide-react';
import { DocumentationArticle } from '@/components/layouts/article';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

const cardClassName =
    'flex min-h-60 flex-col -me-px -mb-px rounded-none border border-border bg-transparent p-[calc(calc(var(--spacing)*6)-1px)] text-inherit no-underline hover:border-ring hover:bg-muted active:bg-accent focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid focus-visible:outline-offset-2';

const article = {
    title: 'Documentation | LongLink',
    description:
        'Learn how to build Python Solutions with the LongLink SDK and use the Platform to manage organizations, access, infrastructure, and deployment.',
    toc: [
        { id: 'documentation', label: 'Documentation', level: 1 },
        { id: 'start-here', label: 'Start here', level: 2 }
    ],
    lastUpdated: '2026-10-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/index.tsx'
};

/** Introduces the documentation and links to the main guides and references. */
export default function DocsIndex() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={6}>
                <Heading id="documentation" level={1}>
                    Documentation
                </Heading>
                <Text as="p">
                    Learn how to build, run, and manage solutions with LongLink. Start with the basics, create your
                    first Solution, or explore the platform in more detail.
                </Text>
                <Stack as="section" gap={3}>
                    <Heading id="start-here" level={2}>
                        Start here
                    </Heading>
                    <Grid columns={{ minWidth: 200, max: 3, repeat: 'fit' }} gap={0}>
                        <Link className={cardClassName} to="/docs/introduction/" aria-label="Explore LongLink">
                            <Stack className="flex-1" gap={6} justify="between">
                                <Lightbulb aria-hidden="true" className="text-muted-foreground" size={24} />
                                <Stack gap={3}>
                                    <Text className="font-bold">Explore LongLink</Text>
                                    <Text as="p" className="text-muted-foreground text-pretty">
                                        Learn the core concepts and discover what you can build.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Link>
                        <Link className={cardClassName} to="/docs/sdk/" aria-label="Build a Solution">
                            <Stack className="flex-1" gap={6} justify="between">
                                <Code2 aria-hidden="true" className="text-muted-foreground" size={24} />
                                <Stack gap={3}>
                                    <Text className="font-bold">Build a Solution</Text>
                                    <Text as="p" className="text-muted-foreground text-pretty">
                                        Create a Solution and see how the pieces fit together.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Link>
                        <Link className={cardClassName} to="/docs/api/" aria-label="Explore the Platform">
                            <Stack className="flex-1" gap={6} justify="between">
                                <ServerCog aria-hidden="true" className="text-muted-foreground" size={24} />
                                <Stack gap={3}>
                                    <Text className="font-bold">Explore the Platform</Text>
                                    <Text as="p" className="text-muted-foreground text-pretty">
                                        Learn how LongLink runs and manages your Solutions.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Link>
                    </Grid>
                </Stack>
            </Stack>
        </DocumentationArticle>
    );
}
