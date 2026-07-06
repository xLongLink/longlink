import type { ArticleNavigationGroup, ArticlePage } from '@/pages/catalog';
import { content as impressumContent, metadata as impressumMetadata } from '@/pages/legal/impressum';
import { content as privacyContent, metadata as privacyMetadata } from '@/pages/legal/privacy';
import { content as termsContent, metadata as termsMetadata } from '@/pages/legal/terms';
import { FileText, Landmark, ShieldCheck } from 'lucide-react';

const homeBreadcrumb = { title: 'Home', path: '/' };

const termsPage: ArticlePage = {
    title: 'Terms of Service',
    path: '/terms',
    id: 'terms-of-service',
    icon: FileText,
    breadcrumbs: [homeBreadcrumb, { title: 'Terms of Service', path: '/terms' }],
    content: termsContent,
    metadata: termsMetadata,
};

const impressumPage: ArticlePage = {
    title: 'Impressum',
    path: '/impressum',
    id: 'impressum',
    icon: Landmark,
    breadcrumbs: [homeBreadcrumb, { title: 'Impressum', path: '/impressum' }],
    content: impressumContent,
    metadata: impressumMetadata,
};

const privacyPage: ArticlePage = {
    title: 'Privacy',
    path: '/privacy',
    id: 'privacy-policy',
    icon: ShieldCheck,
    breadcrumbs: [homeBreadcrumb, { title: 'Privacy', path: '/privacy' }],
    content: privacyContent,
    metadata: privacyMetadata,
};

export const LEGAL_PAGES: ArticlePage[] = [termsPage, impressumPage, privacyPage];

export const LEGAL_GROUPS: ArticleNavigationGroup[] = [
    {
        title: 'Legal',
        items: LEGAL_PAGES.map((page) => ({
            title: page.title,
            path: page.path,
            id: page.id,
            icon: page.icon,
        })),
    },
];
