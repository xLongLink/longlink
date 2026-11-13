import { DocumentationArticle } from '@/components/layouts/article';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

const article = {
    title: 'Alternatives | LongLink',
    description: 'Alternatives to LongLink.',
    toc: [],
    lastUpdated: '2026-10-16',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/alternatives/index.tsx'
};

/** Keeps the Alternatives tab available without listing any alternatives. */
export default function Alternatives() {
    return (
        <DocumentationArticle article={article}>
            <Heading level={1}>Alternatives</Heading>
        </DocumentationArticle>
    );
}
