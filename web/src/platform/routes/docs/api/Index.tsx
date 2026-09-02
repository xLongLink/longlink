import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { PlatformFlowDiagram } from '@/components/PlatformFlowDiagram';

const metadata = {
    seo: {
        title: 'Platform Documentation | LongLink',
        description: 'Learn how the LongLink Platform manages organizations, Solutions, and shared infrastructure.',
    },
    toc: [{ id: 'platform', label: 'Platform', level: 1 }],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Index.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Heading id="platform" level={1}>
                    Platform
                </Heading>
                <Text as="p">
                    The LongLink Platform provides the shared foundation for running Solutions across an organization.
                    It manages organizations, users, access, deployments, and their supporting infrastructure.
                </Text>
                <Text as="p">
                    Each Solution has its own source and purpose and runs as a separate service. LongLink provides the
                    surrounding layer: it controls access, prepares required resources, makes the service available to
                    authorized users, and provides visibility into deployments, logs, and status.
                </Text>
                <Text as="p">
                    This gives teams a consistent and governed operating model without rebuilding the same foundation
                    for every service.
                </Text>
                <PlatformFlowDiagram />
            </Stack>
        </Article>
    );
}
