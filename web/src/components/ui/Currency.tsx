import { Stack } from '@astryxdesign/core/Stack';

/** Formats amounts using standard internationalization instead of custom formatting callbacks. */
export function Currency({
    value,
    currency,
    locale,
    hidden,
}: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    /** Amount to format in currency units. */
    value: number;
    /** ISO 4217 currency code, such as USD or CHF. */
    currency: string;
    /** Locale for formatting; omitted values use the viewer's locale. */
    locale?: string;
}) {
    // Keep formatted amounts inline while giving visibility a native element to hide.
    return (
        <Stack as="span" hidden={hidden} className={hidden ? 'hidden!' : 'contents!'}>
            {new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)}
        </Stack>
    );
}
