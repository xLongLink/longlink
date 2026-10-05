/** Formats amounts using standard internationalization instead of custom formatting callbacks. */
export function Currency({ value, currency, locale }: { value: number; currency: string; locale?: string }) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}
