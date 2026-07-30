import type { MetaDescriptor } from 'react-router';
import { publicRoutePath, SITE_URL, type PublicPage } from '@/platform/public';

/** Builds metadata for routes that search engines must not index. */
export function noIndexMeta(title = 'LongLink'): MetaDescriptor[] {
    return [{ title }, { name: 'robots', content: 'noindex, nofollow' }];
}

/** Builds React Router metadata for one prerendered public page. */
export function publicSeoMeta(page: PublicPage): MetaDescriptor[] {
    const canonicalUrl = `${SITE_URL}${publicRoutePath(page.path)}`;
    const title =
        page.seoTitle ?? (page.path.startsWith('/docs') ? `${page.title} | LongLink Docs` : `${page.title} | LongLink`);
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
                  '@type': page.path.startsWith('/docs') ? 'TechArticle' : 'WebPage',
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
