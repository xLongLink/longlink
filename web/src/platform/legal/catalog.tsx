import { FileText, Landmark, ShieldCheck } from 'lucide-react';
import type { ArticleNavigationGroup, ArticlePage } from '@/platform/catalog';
import { content as impressumContent, metadata as impressumMetadata } from '@/platform/legal/impressum';
import { content as privacyContent, metadata as privacyMetadata } from '@/platform/legal/privacy';
import { content as termsContent, metadata as termsMetadata } from '@/platform/legal/terms';
import { homePage, legalPages } from '@/platform/public';

/** Builds a legal page with its standard Home breadcrumb. */
function legalPage(page: Omit<ArticlePage, 'breadcrumbs'>): ArticlePage {
    return {
        ...page,
        breadcrumbs: [
            { title: 'Home', path: homePage.path },
            { title: page.title, path: page.path },
        ],
    };
}

export const LEGAL_PAGES: ArticlePage[] = [
    legalPage({
        ...legalPages.terms,
        icon: <FileText aria-hidden="true" size={16} />,
        content: termsContent,
        metadata: termsMetadata,
    }),
    legalPage({
        ...legalPages.impressum,
        icon: <Landmark aria-hidden="true" size={16} />,
        content: impressumContent,
        metadata: impressumMetadata,
    }),
    legalPage({
        ...legalPages.privacy,
        icon: <ShieldCheck aria-hidden="true" size={16} />,
        content: privacyContent,
        metadata: privacyMetadata,
    }),
];

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
