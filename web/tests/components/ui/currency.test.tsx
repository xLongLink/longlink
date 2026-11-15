// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { Currency } from '@/components/longlink/currency';

it.each([
    [1234.5, 'USD', 'en-US', '$1,234.50'],
    [-1234.5, 'EUR', 'de-DE', '-1.234,50 €'],
    [1234, 'JPY', 'ja-JP', '￥1,234']
] as const)('formats %s %s in currency units for %s', (value, currency, locale, expected) => {
    const output = renderStatic(<Currency value={value} currency={currency} locale={locale} />);

    expect(output.textContent).toBe(expected);
});
