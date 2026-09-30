import { z } from 'zod';
import type { Props } from '../types';
import { useXmlRuntime } from '../core/context';
import { resolveXmlProps } from '../core/props';

const currencyPropsSchema = z.object({
    value: z.number().finite(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    locale: z.string().min(1).optional(),
});

/** Formats a numeric amount with its currency code and locale-specific precision. */
export function Currency({ props }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { value, currency, locale } = resolveXmlProps(props, ctx, currencyPropsSchema, ['currency', 'locale']);

    // Let Intl validate locale identifiers and apply the currency's standard fraction digits.
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' });
    return formatter.format(value);
}
