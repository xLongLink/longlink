import { startCase } from 'es-toolkit/compat';
import { Fragment, type ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import {
    Breadcrumb,
    BreadcrumbItem as BreadcrumbEntry,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/shadcn/breadcrumb';

export type BreadcrumbItem = { label: ReactNode; href?: string };

/** Decodes a URL path segment without throwing for malformed percent encoding. */
function decodePathSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/** Builds breadcrumb labels and cumulative links without choosing current-item presentation. */
export function buildBreadcrumbs(pathname: string, labels?: Record<string, string>): { label: string; href: string }[] {
    // Apply the shared trailing-slash convention to each cumulative path.
    const segments = pathname.split('/').filter(Boolean);

    return segments.map((segment, index) => ({
        label: labels?.[segment] ?? startCase(decodePathSegment(segment)),
        href: `/${segments.slice(0, index + 1).join('/')}/`
    }));
}

/** Renders breadcrumb items derived from the current URL path. */
export function PathBreadcrumb({ labels, root }: { labels?: Record<string, string>; root?: BreadcrumbItem }) {
    const { pathname } = useLocation();
    const items = buildBreadcrumbs(pathname, labels);

    return <Breadcrumbs items={root ? [root, ...items] : items} />;
}

/** Renders native ancestor links and marks only the final item as the current page. */
export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
    return (
        <Breadcrumb aria-label="Breadcrumb" className="min-w-0 overflow-hidden">
            <BreadcrumbList>
                {items.map(({ label, href }, index) => (
                    <Fragment key={href ?? index}>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbEntry className="min-w-0 max-w-full">
                            {index === items.length - 1 ? (
                                <BreadcrumbPage className="min-w-0 truncate">{label}</BreadcrumbPage>
                            ) : href !== undefined ? (
                                <BreadcrumbLink render={<RouterLink to={href} />} className="min-w-0 truncate">
                                    {label}
                                </BreadcrumbLink>
                            ) : (
                                <span className="min-w-0 truncate">{label}</span>
                            )}
                        </BreadcrumbEntry>
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
