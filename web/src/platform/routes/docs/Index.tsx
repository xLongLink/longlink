import './index.css';
import { Link } from 'react-router';
import { Grid } from '@/components/ui/Grid';
import { Code2, Lightbulb, ServerCog } from 'lucide-react';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { DocumentationArticle } from '@/components/layouts/Article';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';

const article = {
    title: 'Documentation | LongLink',
    description:
        'Learn how to build Python Solutions with the LongLink SDK and use the Platform to manage organizations, access, infrastructure, and deployment.',
    toc: [
        { id: 'documentation', label: 'Documentation', level: 1 },
        { id: 'start-here', label: 'Start here', level: 2 }
    ],
    lastUpdated: '2026-10-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/Index.tsx'
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
                        <Link className="documentation-card" to="/docs/introduction/" aria-label="Explore LongLink">
                            <Stack className="flex-1" gap={6} justify="between">
                                <Lightbulb aria-hidden="true" className="text-(--color-icon-secondary)" size={24} />
                                <Stack gap={3}>
                                    <Text weight="bold">Explore LongLink</Text>
                                    <Text as="p" color="secondary" textWrap="pretty">
                                        Learn the core concepts and discover what you can build.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Link>
                        <Link className="documentation-card" to="/docs/sdk/" aria-label="Build a Solution">
                            <Stack className="flex-1" gap={6} justify="between">
                                <Code2 aria-hidden="true" className="text-(--color-icon-secondary)" size={24} />
                                <Stack gap={3}>
                                    <Text weight="bold">Build a Solution</Text>
                                    <Text as="p" color="secondary" textWrap="pretty">
                                        Create a Solution and see how the pieces fit together.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Link>
                        <Link className="documentation-card" to="/docs/api/" aria-label="Explore the Platform">
                            <Stack className="flex-1" gap={6} justify="between">
                                <ServerCog aria-hidden="true" className="text-(--color-icon-secondary)" size={24} />
                                <Stack gap={3}>
                                    <Text weight="bold">Explore the Platform</Text>
                                    <Text as="p" color="secondary" textWrap="pretty">
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
