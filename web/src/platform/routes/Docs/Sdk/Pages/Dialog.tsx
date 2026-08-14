import { DOC_GROUPS, DOC_PAGES } from '@/platform/docs/catalog';
import { ArticleRoute, createArticleMeta } from '@/platform/routes/Articles';

export const meta = createArticleMeta(DOC_PAGES);

export default function DocsSdkPagesDialogArticle() {
    return <ArticleRoute groups={DOC_GROUPS} hasPageNavigation pages={DOC_PAGES} />;
}
