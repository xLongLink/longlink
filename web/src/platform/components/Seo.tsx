import { siteName, siteUrl } from '@/site';
import { useLocation } from 'react-router';
import { useCasePages } from '@/platform/usecases';
import { brandingPages } from '@/platform/branding';
import { buildBreadcrumbs } from '@/components/breadcrumb/text';

/** Labels for public article route segments shared with visible breadcrumbs. */
export const articleRouteLabels = {
    api: 'Platform',
    docs: 'Documentation',
    introduction: 'Why LongLink',
    sdk: 'Solutions',
    'use-cases': 'Use cases',
    views: 'Views',

    // Keep authored page labels in their navigation catalogs without replacing section labels.
    ...Object.fromEntries(
        brandingPages.map(({ path, label }) => [path.slice(path.lastIndexOf('/') + 1), label] as const)
    ),
    ...Object.fromEntries(
        useCasePages.map(({ path, label }) => [path.slice(path.lastIndexOf('/') + 1), label] as const)
    ),
} satisfies Record<string, string>;

/** Returns the canonical path with the site-wide trailing-slash convention. */
function canonicalPath(pathname: string): string {
    return pathname === '/' ? pathname : `${pathname.replace(/\/+$/, '')}/`;
}

/** Builds breadcrumb structured data for an article's current route. */
function breadcrumbs(pathname: string) {
    const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` }];

    for (const [index, segment] of buildBreadcrumbs(pathname, articleRouteLabels).entries()) {
        items.push({
            '@type': 'ListItem',
            position: index + 2,
            name: segment.label,
            item: `${siteUrl}${segment.href}`,
        });
    }

    return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

/** Renders the document metadata declared by the active route. */
export function Seo({
    description,
    hasBreadcrumbs,
    structuredData,
    title,
}: {
    description: string;
    hasBreadcrumbs?: boolean;
    structuredData?: object;
    title: string;
}) {
    const { pathname } = useLocation();
    const canonicalUrl = `${siteUrl}${canonicalPath(pathname)}`;
    const schema = structuredData ?? (hasBreadcrumbs ? breadcrumbs(pathname) : undefined);

    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="robots" content="index, follow" />
            <link rel="canonical" href={canonicalUrl} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={siteName} />
            <meta property="og:url" content={canonicalUrl} />
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            {schema ? (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll('<', '\\u003c') }}
                />
            ) : null}
        </>
    );
}
