import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { PlatformFlowDiagram } from '@/components/PlatformFlowDiagram';

const metadata = {
    seo: {
        title: 'Platform Documentation | LongLink',
        description: 'Learn how LongLink Platform manages organizations, applications, and shared infrastructure.',
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
                    The LongLink Platform provides the shared foundation for running applications across an
                    organization. It manages users, organizations, access, applications, deployments, and the
                    infrastructure they depend on.
                </Text>
                <Text as="p">
                    Applications remain separate services with their own code and purpose. LongLink provides the layer
                    around them: it controls access, prepares the resources each application needs, makes applications
                    available to the right users, and provides visibility into deployments, logs, and status.
                </Text>
                <Text as="p">
                    This gives teams a consistent and governed way to operate many dedicated applications without
                    rebuilding the same operational foundation for each one.
                </Text>
                <PlatformFlowDiagram />
            </Stack>
        </Article>
    );
}
