export const dateFormatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
});
export const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
    minute: 'numeric',
    month: 'numeric',
    second: 'numeric',
    year: 'numeric',
});
const numberFormatter = new Intl.NumberFormat();

/** Formats bytes using binary units for admin resource tables. */
export function formatBytes(bytes: number): string {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes;
    let unit = 0;

    // Scale bytes until they fit the current unit.
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }

    return `${numberFormatter.format(Math.round(value))} ${units[unit]}`;
}

/** Converts kebab-case, snake_case, or camelCase text into space-separated words with leading capitals. */
export function startCase(value: string): string {
    const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

    return spaced
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/** Decodes a URL path segment without throwing for malformed percent encoding. */
export function decodePathSegment(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/** Creates an open-change handler that ignores close attempts while a request is pending. */
export function createGuardedOpenChange(isPending: boolean, onOpenChange: (open: boolean) => void) {
    return (nextOpen: boolean) => {
        // Protect an in-flight request from being dismissed.
        if (!nextOpen && isPending) {
            return;
        }

        onOpenChange(nextOpen);
    };
}
