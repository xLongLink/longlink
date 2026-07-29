import { DOC_GROUPS, DOC_PAGES } from '@/platform/docs/catalog';
import { ArticleRoute, createArticleMeta } from '@/platform/routes/articles';

/** Returns metadata for the documentation article matched by the current URL. */
export const meta = createArticleMeta(DOC_PAGES);

/** Resolves and renders the documentation article matched by the current URL. */
export default function DocumentationRoute() {
    return <ArticleRoute groups={DOC_GROUPS} pages={DOC_PAGES} />;
}
