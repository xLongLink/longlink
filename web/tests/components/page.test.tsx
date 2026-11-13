// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../render';
import { Page } from '@/components/page';

it('renders the page title and description', () => {
    // Act
    const output = renderStatic(
        <Page title="Orders" description="Order process">
            <main>Orders content</main>
        </Page>,
        '/docs/orders?search=secret'
    );

    // Assert
    expect(output.querySelector('title')?.textContent).toBe('Orders');
    expect(output.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Order process');
});
