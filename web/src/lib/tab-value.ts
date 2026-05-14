/**
 * Converts a tab label into a stable URL value.
 */
export function tabValueFromName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '/')
        .replace(/[^a-z0-9/-]+/g, '');
}
