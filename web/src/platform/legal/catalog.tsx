import { FileText, Landmark, ShieldCheck } from 'lucide-react';
import type { ArticleNavigationGroup, ArticlePage } from '@/platform/catalog';
import { homePage, legalPages } from '@/platform/public';
import { content as termsContent, metadata as termsMetadata } from '@/platform/legal/terms';
import { content as privacyContent, metadata as privacyMetadata } from '@/platform/legal/privacy';
import { content as impressumContent, metadata as impressumMetadata } from '@/platform/legal/impressum';

const homeBreadcrumb = { title: 'Home', path: homePage.path };

/** Builds a legal page with its standard Home breadcrumb. */
function legalPage(page: Omit<ArticlePage, 'breadcrumbs'>): ArticlePage {
    return {
        ...page,
        breadcrumbs: [homeBreadcrumb, { title: page.title, path: page.path }],
    };
}

const termsPage = legalPage({
    ...legalPages.terms,
    icon: <FileText aria-hidden="true" size={16} />,
    content: termsContent,
    metadata: termsMetadata,
});

const impressumPage = legalPage({
    ...legalPages.impressum,
    icon: <Landmark aria-hidden="true" size={16} />,
    content: impressumContent,
    metadata: impressumMetadata,
});

const privacyPage = legalPage({
    ...legalPages.privacy,
    icon: <ShieldCheck aria-hidden="true" size={16} />,
    content: privacyContent,
    metadata: privacyMetadata,
});

export const LEGAL_PAGES: ArticlePage[] = [termsPage, impressumPage, privacyPage];

export const LEGAL_GROUPS: ArticleNavigationGroup[] = [
    {
        title: 'Legal',
        items: LEGAL_PAGES.map((page) => ({
            title: page.title,
            path: page.path,
            icon: page.icon,
        })),
    },
];
