/** Metadata shared by public pages, build-time prerendering, and SEO. */
export type PageMetadata = {
    path: string;
    title: string;
    description: string;
    seoTitle?: string;
};

/** Metadata rendered with documentation and legal articles. */
export type ArticleMetadata = PageMetadata & {
    toc?: Array<{ id: string; label: string; level: number }>;
    lastUpdated: string;
    editUrl?: string;
};
