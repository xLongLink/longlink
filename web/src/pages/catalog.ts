import type { LucideProps } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

type ArticleIcon = ReactElement<LucideProps>;

/** Metadata shared by article-like public pages. */
export type ArticleMetadata = {
    lastUpdated?: string;
    editUrl?: string;
};

/** One breadcrumb link rendered above an article page. */
export type ArticleBreadcrumb = {
    title: string;
    path: string;
};

/** Shared navigation identity for article-like pages. */
export type ArticleItem = {
    title: string;
    path: string;
    icon: ArticleIcon;
    breadcrumbs: ArticleBreadcrumb[];
};

/** A renderable article page. */
export type ArticlePage = ArticleItem & {
    content: ReactNode;
    metadata: ArticleMetadata;
};

/** Sidebar navigation item for article-like pages. */
export type ArticleNavigationItem = Omit<ArticleItem, 'breadcrumbs' | 'icon'> & {
    icon?: ArticleIcon;
    children?: ArticleNavigationItem[];
};

/** Sidebar navigation group for article-like pages. */
export type ArticleNavigationGroup = {
    title: string;
    items: ArticleNavigationItem[];
};
