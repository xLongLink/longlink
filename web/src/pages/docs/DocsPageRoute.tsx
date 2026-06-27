import DocsLayout from '@/layout/DocsLayout';
import type { DocPage } from '@/pages/docs/catalog';

type DocsPageRouteProps = {
    page: DocPage;
};

/** Renders one docs page inside the shared docs shell. */
export default function DocsPageRoute({ page }: DocsPageRouteProps) {
    return <DocsLayout content={page.content} metadata={page.metadata} />;
}
