import { startCase } from 'es-toolkit/compat';

/** Decodes a URL path segment without throwing for malformed percent encoding. */
export function decodePathSegment(segment: string): string {
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
