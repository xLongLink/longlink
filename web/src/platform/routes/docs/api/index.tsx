import { DocumentationArticle } from '@/components/layouts/article';
import { NativeStack as Stack } from '@/components/custom/native-stack';

const article = {
    description: 'Learn how the LongLink Platform manages organizations, Solutions, and shared infrastructure.',
    toc: [{ id: 'platform', label: 'Platform', level: 1 }],
    lastUpdated: '2026-10-18',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/api/index.tsx',
    title: 'Platform Documentation | LongLink'
};

export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="platform">
                    Platform
                </h1>
                <p>
                    The Platform exists to keep an organization’s processes and data in a single place. This keeps both
                    the work and the information organized: work is done locally, while the cloud provides validation
                    and stores data in a consistent structure. This makes processes easier to review, manage, and
                    improve over time.
                </p>
            </Stack>
        </DocumentationArticle>
    );
}
