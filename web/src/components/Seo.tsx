import { siteName, siteUrl } from '@/site';
import { useLocation } from 'react-router';
import { buildBreadcrumbs } from '@/components/breadcrumb/text';

/** Labels for public article route segments shared with visible breadcrumbs. */
export const articleRouteLabels: Record<string, string> = {
    'approvals-and-decisions': 'Approvals & decisions',
    api: 'Platform',
    'cases-and-projects': 'Cases & projects',
    'compliance-and-quality': 'Compliance & quality',
    docs: 'Documentation',
    'longlink-vs-retool': 'LongLink vs Retool',
    'longlink-vs-lovable': 'LongLink vs Lovable',
    'longlink-vs-windmill': 'LongLink vs Windmill',
    'longlink-vs-microsoft-power-apps': 'LongLink vs Microsoft Power Apps',
    'longlink-vs-replit': 'LongLink vs Replit',
    'longlink-vs-appsmith': 'LongLink vs Appsmith',
    'longlink-vs-superblocks': 'LongLink vs Superblocks',
    'longlink-vs-fastapi': 'LongLink vs FastAPI',
    'longlink-vs-reflex': 'LongLink vs Reflex',
    sdk: 'Solutions',
    'use-cases': 'Use cases',
    views: 'Views',
};

/** Returns the canonical path with the site-wide trailing-slash convention. */
function canonicalPath(pathname: string): string {
    return pathname === '/' ? pathname : `${pathname.replace(/\/+$/, '')}/`;
}

/** Builds breadcrumb structured data for an article's current route. */
function breadcrumbs(pathname: string): object {
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

/** Prevents indexing without publishing canonical or social metadata for a private page. */
export function NoIndex({ title }: { title: string }) {
    return (
        <>
            <title>{title}</title>
            <meta name="robots" content="noindex, nofollow" />
        </>
    );
}
