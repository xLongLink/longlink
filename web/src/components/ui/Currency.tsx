/** Formats amounts using standard internationalization instead of custom formatting callbacks. */
export function Currency({
    value,
    currency,
    locale,
}: {
    /** Amount to format in currency units. */
    value: number;
    /** ISO 4217 currency code, such as USD or CHF. */
    currency: string;
    /** Locale for formatting; omitted values use the viewer's locale. */
    locale?: string;
}) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}
