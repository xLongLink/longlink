// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import { Heading } from '@/components/longlink/display/heading';

it('keeps heading semantics independent of visual size', () => {
    const output = renderStatic(
        <>
            <Heading size={4}>Orders</Heading>
            <Heading level={3} size={1}>
                Open orders
            </Heading>
        </>
    );

    expect(output.querySelector('h2')?.textContent).toBe('Orders');
    expect(output.querySelector('h3')?.textContent).toBe('Open orders');
});
