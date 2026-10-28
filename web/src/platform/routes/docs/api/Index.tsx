import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { DocumentationArticle } from '@/components/layouts/Article';

const article = {
    description: 'Learn how the LongLink Platform manages organizations, Solutions, and shared infrastructure.',
    toc: [{ id: 'platform', label: 'Platform', level: 1 }],
    lastUpdated: '2026-10-18',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/Index.tsx',
    title: 'Platform Documentation | LongLink',
};

export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="platform" level={1}>
                    Platform
                </Heading>
                <Blockquote className="border-s-(--color-text-orange) text-(--color-text-orange)">
                    <Stack gap={0}>
                        <Text type="inherit">Beta notice: This page is being built.</Text>
                        <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                            Edit on GitHub
                        </Link>
                    </Stack>
                </Blockquote>
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
