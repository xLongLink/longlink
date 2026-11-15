import type { ReactNode } from 'react';
import { Page } from '@/components/ui/page';
import { ArticleOutline } from './article-outline';
import { documentationPaths } from '@/platform/publications';
import { ArticleFooter, type ArticleMetadata } from './article';

/** Renders documentation with its own typography and collection navigation. */
export function DocumentationArticle({ article, children }: { article: ArticleMetadata; children: ReactNode }) {
    // Keep documentation spacing and reading order owned by its layout.
    return (
        <Page description={article.description} title={article.title}>
            <div className="p-6">
                <div className="mx-auto flex w-full min-w-0 max-w-[1016px] gap-6">
                    <div className="mx-auto flex min-w-0 max-w-[720px] flex-1 flex-col">
                        <article className="space-y-7 text-lg [&_:is(h1,h2,h3,h4,h5,h6):not(dialog_*)]:tracking-wide [&_:is(h2,h3,h4,h5,h6):not(dialog_*)]:[margin-block-start:calc(var(--spacing)*18)] [&_p]:opacity-90">
                            {children}
                            <ArticleFooter
                                lastUpdated={article.lastUpdated}
                                editUrl={article.editUrl}
                                paths={documentationPaths}
                            />
                        </article>
                    </div>
                    {article.toc.length ? <ArticleOutline items={article.toc} /> : null}
                </div>
            </div>
        </Page>
    );
}
