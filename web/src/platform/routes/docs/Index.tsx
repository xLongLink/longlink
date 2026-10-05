import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Code2, Lightbulb, ServerCog } from 'lucide-react';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';

const article = {
    title: 'Documentation | LongLink',
    description:
        'Learn how to build Python Solutions with the LongLink SDK and use the Platform to manage organizations, access, infrastructure, and deployment.',
    toc: [
        { id: 'documentation', label: 'Documentation', level: 1 },
        { id: 'start-here', label: 'Start here', level: 2 },
    ],
    lastUpdated: '2026-10-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/Index.tsx',
};

/** Introduces the documentation and links to the main guides and references. */
export default function DocsIndex() {
    return (
        <Article page={article}>
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
                        <ClickableCard
                            className="-mb-px -mr-px min-h-60 rounded-none bg-transparent"
                            href="/use-cases/"
                            label="Explore LongLink"
                            padding={6}
                        >
                            <Stack gap={6} height="100%" justify="between">
                                <Icon color="tertiary" icon={Lightbulb} size="lg" />
                                <Stack gap={3}>
                                    <Text weight="bold">Explore LongLink</Text>
                                    <Text as="p" color="secondary" textWrap="pretty">
                                        Learn the core concepts and discover what you can build.
                                    </Text>
                                </Stack>
                            </Stack>
                        </ClickableCard>
                        <ClickableCard
                            className="-mb-px -mr-px min-h-60 rounded-none bg-transparent"
                            href="/docs/sdk/"
                            label="Build a Solution"
                            padding={6}
                        >
                            <Stack gap={6} height="100%" justify="between">
                                <Icon color="tertiary" icon={Code2} size="lg" />
                                <Stack gap={3}>
                                    <Text weight="bold">Build a Solution</Text>
                                    <Text as="p" color="secondary" textWrap="pretty">
                                        Create a Solution and see how the pieces fit together.
                                    </Text>
                                </Stack>
                            </Stack>
                        </ClickableCard>
                        <ClickableCard
                            className="-mb-px -mr-px min-h-60 rounded-none bg-transparent"
                            href="/docs/api/"
                            label="Explore the Platform"
                            padding={6}
                        >
                            <Stack gap={6} height="100%" justify="between">
                                <Icon color="tertiary" icon={ServerCog} size="lg" />
                                <Stack gap={3}>
                                    <Text weight="bold">Explore the Platform</Text>
                                    <Text as="p" color="secondary" textWrap="pretty">
                                        Learn how LongLink runs and manages your Solutions.
                                    </Text>
                                </Stack>
                            </Stack>
                        </ClickableCard>
                    </Grid>
                </Stack>
            </Stack>
        </Article>
    );
}
