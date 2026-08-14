import type { LucideProps } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

/** One breadcrumb link rendered above an article page. */
export type ArticleBreadcrumb = {
    title: string;
    path: string;
};

/** A renderable article page. */
export type ArticlePage = {
    title: string;
    path: string;
    icon?: ReactElement<LucideProps>;
    description: string;
    seoTitle?: string;
    breadcrumbs: ArticleBreadcrumb[];
    content: ReactNode;
    metadata: {
        toc?: Array<{ id: string; label: string; level: number }>;
        lastUpdated: string;
        editUrl?: string;
    };
};

/** Sidebar navigation item for article-like pages. */
export type ArticleNavigationItem = Pick<ArticlePage, 'title' | 'path'> & {
    icon?: ReactElement<LucideProps>;
    children?: ArticleNavigationItem[];
};

/** Sidebar navigation group for article-like pages. */
export type ArticleNavigationGroup = {
    title: string;
    items: ArticleNavigationItem[];
};
