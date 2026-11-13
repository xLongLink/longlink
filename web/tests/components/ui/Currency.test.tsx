// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { Currency } from '@/components/custom/Currency';

it('formats the supplied currency in the requested locale', () => {
    // Act
    const output = renderStatic(<Currency value={12.5} currency="USD" locale="en-US" />);

    // Assert
    expect(output.textContent).toContain('$12.50');
});
