import { Heading } from '@astryxdesign/core/Heading';
import { DocumentationArticle } from '@/components/layouts/Article';

const article = {
    title: 'Alternatives | LongLink',
    description: 'Alternatives to LongLink.',
    toc: [],
    lastUpdated: '2026-10-16',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/alternatives/Index.tsx',
};

/** Keeps the Alternatives tab available without listing any alternatives. */
export default function Alternatives() {
    return (
        <DocumentationArticle article={article}>
            <Heading level={1}>Alternatives</Heading>
        </DocumentationArticle>
    );
}
