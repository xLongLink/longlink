import type { ReactNode } from 'react';
import { Page } from '@/components/ui/page';
import { documentationPaths } from '@/platform/publications';
import { ArticleBody, type ArticleMetadata } from '@/components/layouts/article';

/** Renders documentation with its own typography and collection navigation. */
export function DocumentationArticle({ article, children }: { article: ArticleMetadata; children: ReactNode }) {
    // Keep documentation spacing and reading order owned by its layout.
    return (
        <Page description={article.description} title={article.title}>
            <ArticleBody
                article={article}
                paths={documentationPaths}
                className="space-y-7 text-lg [&_:is(h1,h2,h3,h4,h5,h6):not(dialog_*)]:tracking-wide [&_:is(h2,h3,h4,h5,h6):not(dialog_*)]:[margin-block-start:calc(var(--spacing)*18)] [&_p]:opacity-90"
            >
                {children}
            </ArticleBody>
        </Page>
    );
}
