import type { MetaDescriptor } from 'react-router';
import type { PageMetadata } from '@/lib/pages';
import { publicRoutePath, SITE_URL } from '@/lib/urls';

/** Builds metadata for routes that search engines must not index. */
export function noIndexMeta(title = 'LongLink'): MetaDescriptor[] {
    return [{ title }, { name: 'robots', content: 'noindex, nofollow' }];
}

/** Builds React Router metadata for one prerendered public page. */
export function publicSeoMeta(page: PageMetadata): MetaDescriptor[] {
    const canonicalUrl = `${SITE_URL}${publicRoutePath(page.path)}`;
    const isDocumentation = page.path.startsWith('/docs');
    const title = page.seoTitle ?? (isDocumentation ? `${page.title} | LongLink Docs` : `${page.title} | LongLink`);
    const structuredData =
        page.path === '/'
            ? {
                  '@context': 'https://schema.org',
                  '@type': 'WebSite',
                  name: 'LongLink',
                  url: canonicalUrl,
                  hasPart: [
                      { '@type': 'SiteNavigationElement', name: 'Pricing', url: `${SITE_URL}/pricing/` },
                      { '@type': 'SiteNavigationElement', name: 'Documentation', url: `${SITE_URL}/docs/` },
                      {
                          '@type': 'SiteNavigationElement',
                          name: 'Applications / SDK Docs',
                          url: `${SITE_URL}/docs/sdk/`,
                      },
                      {
                          '@type': 'SiteNavigationElement',
                          name: 'Platform Docs',
                          url: `${SITE_URL}/docs/api/`,
                      },
                  ],
              }
            : {
                  '@context': 'https://schema.org',
                  '@type': isDocumentation ? 'TechArticle' : 'WebPage',
                  name: title,
                  description: page.description,
                  url: canonicalUrl,
              };

    return [
        { title },
        { name: 'description', content: page.description },
        { name: 'robots', content: 'index, follow' },
        { tagName: 'link', rel: 'canonical', href: canonicalUrl },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:title', content: title },
        { property: 'og:description', content: page.description },
        { 'script:ld+json': structuredData },
    ];
}
