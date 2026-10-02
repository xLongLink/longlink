import { startCase } from 'es-toolkit/compat';

/** Decodes a URL path segment without throwing for malformed percent encoding. */
function decodePathSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/** Returns an explicit label or a readable fallback for a URL path segment. */
export function formatPathSegment(segment: string, labels: Record<string, string> = {}): string {
    return labels[segment] ?? startCase(decodePathSegment(segment));
}

/** Builds shared breadcrumb labels and links without choosing root or current-item presentation. */
export function buildBreadcrumbs(pathname: string, labels?: Record<string, string>): { label: string; href: string }[] {
    // Apply the shared trailing-slash and documentation landing-page policy to each cumulative path.
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join('/')}/`;
        return {
            label: formatPathSegment(segment, labels),
            href: path === '/docs/' ? '/docs/introduction/' : path,
        };
    });
}
