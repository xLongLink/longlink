/** Metadata shared by public pages, build-time prerendering, and SEO. */
export type PageMetadata = {
    path: string;
    title: string;
    description: string;
    seoTitle?: string;
};
