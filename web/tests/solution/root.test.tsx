// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { Layout } from '@/solution/root';
import { createRoutesStub } from 'react-router';
import { renderToStaticMarkup } from 'react-dom/server';

it('keeps the embedded Solution fallback out of search indexing', () => {
    // Act
    const Routes = createRoutesStub([{ path: '/', Component: () => <Layout>Solution</Layout> }]);

    const output = document.createElement('html');
    output.innerHTML = renderToStaticMarkup(<Routes />);

    // Assert
    expect(output.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
});
