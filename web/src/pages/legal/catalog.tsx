import type { ArticleNavigationGroup, ArticlePage } from '@/pages/catalog';
import { content as impressumContent, metadata as impressumMetadata } from '@/pages/legal/impressum';
import { content as privacyContent, metadata as privacyMetadata } from '@/pages/legal/privacy';
import { content as termsContent, metadata as termsMetadata } from '@/pages/legal/terms';
import { FileText, Landmark, ShieldCheck } from 'lucide-react';

const homeBreadcrumb = { title: 'Home', path: '/' };

/** Builds a legal page with its standard Home breadcrumb. */
function legalPage(page: Omit<ArticlePage, 'breadcrumbs'>): ArticlePage {
    return {
        ...page,
        breadcrumbs: [homeBreadcrumb, { title: page.title, path: page.path }],
    };
}


const termsPage = legalPage({
    title: 'Terms of Service',
    path: '/terms',
    icon: FileText,
    content: termsContent,
    metadata: termsMetadata,
});

const impressumPage = legalPage({
    title: 'Impressum',
    path: '/impressum',
    icon: Landmark,
    content: impressumContent,
    metadata: impressumMetadata,
});

const privacyPage = legalPage({
    title: 'Privacy',
    path: '/privacy',
    icon: ShieldCheck,
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
