// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { Heading } from '@/components/longlink/display/heading';

it('uses section heading semantics unless another level is requested', () => {
    // Act
    const output = renderStatic(<Heading>Orders</Heading>);

    // Assert
    expect(output.querySelector('h2')?.textContent).toBe('Orders');
});

it.each([1, 2, 3, 4, 5, 6] as const)('preserves the authored heading level %s', (level) => {
    // Native markup must not silently collapse the document outline to a fixed heading level.
    const output = renderStatic(
        <Heading id="orders" level={level} size={level === 2 ? 4 : 2} align="end">
            Orders
        </Heading>
    );

    const heading = output.querySelector('#orders');

    expect(heading?.tagName).toBe(`H${level}`);
    expect(heading?.textContent).toBe('Orders');
    expect(heading?.hasAttribute('aria-level')).toBe(false);
    expect(output.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(1);
});
