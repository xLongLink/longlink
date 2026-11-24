import type { ComponentPropsWithoutRef } from 'react';

/** Formats amounts using standard internationalization instead of custom formatting callbacks. */
export function Currency({
    value,
    currency,
    locale,
    className,
    ...props
}: Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
    /** Amount to format in currency units. */
    value: number;
    /** ISO 4217 currency code, such as USD or CHF. */
    currency: string;
    /** Locale for formatting; omitted values use the viewer's locale. */
    locale?: string;
}) {
    return (
        <span data-slot="currency" {...props} className={className}>
            {new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)}
        </span>
    );
}
