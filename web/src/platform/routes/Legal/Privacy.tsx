import { LEGAL_GROUPS, LEGAL_PAGES } from '@/platform/legal/catalog';
import { ArticleRoute, createArticleMeta } from '@/platform/routes/Articles';

/** Returns metadata for the legal article matched by the current URL. */
export const meta = createArticleMeta(LEGAL_PAGES);

/** Resolves and renders the legal article matched by the current URL. */
export default function PrivacyArticleRoute() {
    return <ArticleRoute groups={LEGAL_GROUPS} pages={LEGAL_PAGES} />;
}
