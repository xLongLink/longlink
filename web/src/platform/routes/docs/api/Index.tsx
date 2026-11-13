import { NativeText as Text } from '@/components/custom/NativeText';
import { DocumentationArticle } from '@/components/layouts/Article';
import { NativeStack as Stack } from '@/components/custom/NativeStack';
import { NativeHeading as Heading } from '@/components/custom/NativeHeading';

const article = {
    description: 'Learn how the LongLink Platform manages organizations, Solutions, and shared infrastructure.',
    toc: [{ id: 'platform', label: 'Platform', level: 1 }],
    lastUpdated: '2026-10-18',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Index.tsx',
    title: 'Platform Documentation | LongLink'
};

export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="platform" level={1}>
                    Platform
                </Heading>
                <Text as="p">
                    The Platform exists to keep an organization’s processes and data in a single place. This keeps both
                    the work and the information organized: work is done locally, while the cloud provides validation
                    and stores data in a consistent structure. This makes processes easier to review, manage, and
                    improve over time.
                </Text>
            </Stack>
        </DocumentationArticle>
    );
}
