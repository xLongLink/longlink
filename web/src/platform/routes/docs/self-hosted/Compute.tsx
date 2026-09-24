import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';

const article = {
    description: 'Compute documentation for self-hosted LongLink.',
    toc: [{ id: 'compute', label: 'Compute', level: 1 }],
    lastUpdated: '2026-09-24',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/self-hosted/Compute.tsx',
    title: 'Compute | Self-hosted Documentation | LongLink',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Heading id="compute" level={1}>
                Compute
            </Heading>
        </Article>
    );
}
