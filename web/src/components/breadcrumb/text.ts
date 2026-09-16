/** Decodes a URL path segment without throwing for malformed percent encoding. */
export function decodePathSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}
