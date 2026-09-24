import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';

const article = {
    description: 'Release documentation for self-hosted LongLink.',
    toc: [{ id: 'release', label: 'Release', level: 1 }],
    lastUpdated: '2026-09-24',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/self-hosted/Release.tsx',
    title: 'Release | Self-hosted Documentation | LongLink',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Heading id="release" level={1}>
                Release
            </Heading>
        </Article>
    );
}
