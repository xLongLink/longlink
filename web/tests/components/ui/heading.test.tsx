// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { Heading } from '@/components/custom/heading';

it('uses section heading semantics unless another level is requested', () => {
    // Act
    const output = renderStatic(<Heading>Orders</Heading>);

    // Assert
    expect(output.querySelector('h2')?.textContent).toBe('Orders');
});

it.each([1, 2, 3, 4, 5, 6] as const)('preserves the authored heading level %s', (level) => {
    // Native markup must not silently collapse the document outline to a fixed heading level.
    const output = renderStatic(<Heading level={level}>Orders</Heading>);

    expect(output.querySelector(`h${level}`)?.textContent).toBe('Orders');
    expect(output.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(1);
});
