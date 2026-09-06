import { siteName, siteUrl } from '@/site';
import { useLocation } from 'react-router';

const breadcrumbLabels: Record<string, string> = {
    api: 'Platform',
    docs: 'Documentation',
    sdk: 'Solutions',
    views: 'Solution Views',
};

type SeoProps = {
    description: string;
    hasBreadcrumbs?: boolean;
    structuredData?: object;
    title: string;
};

/** Returns the canonical path with the site-wide trailing-slash convention. */
function canonicalPath(pathname: string): string {
    return pathname === '/' ? pathname : `${pathname.replace(/\/+$/, '')}/`;
}

/** Formats a URL path segment for breadcrumb structured data. */
function pathLabel(segment: string): string {
    return (
        breadcrumbLabels[segment] ??
        segment.replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
    );
}

/** Builds breadcrumb structured data for an article's current route. */
function breadcrumbs(pathname: string): object {
    const segments = pathname.split('/').filter(Boolean);
    const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` }];

    for (const [index, segment] of segments.entries()) {
        const path = `/${segments.slice(0, index + 1).join('/')}`;
        items.push({
            '@type': 'ListItem',
            position: index + 2,
            name: pathLabel(segment),
            item: `${siteUrl}${canonicalPath(path)}`,
        });
    }

    return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

/** Renders the document metadata declared by the active route. */
export function Seo({ description, hasBreadcrumbs = false, structuredData, title }: SeoProps) {
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
