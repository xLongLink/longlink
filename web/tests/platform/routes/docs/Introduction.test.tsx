// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import Introduction from '@/platform/routes/docs/Introduction';
import { RouterProvider, createMemoryRouter } from 'react-router';

it('redirects the legacy introduction URL to the blog article without retaining it in history', async () => {
    // Arrange
    const router = createMemoryRouter(
        [
            { path: '/pricing/', element: <h1>Pricing</h1> },
            { path: '/docs/introduction/', element: <Introduction /> },
            { path: '/blog/why-longlink/', element: <h1>Why LongLink</h1> }
        ],
        { initialEntries: ['/pricing/', '/docs/introduction/'], initialIndex: 1 }
    );

    const output = document.createElement('section');
    const root = createRoot(output);

    try {
        // Act
        await act(async () => root.render(<RouterProvider router={router} />));

        // Assert
        expect(router.state.location.pathname).toBe('/blog/why-longlink/');
        expect(output.querySelector('h1')?.textContent).toBe('Why LongLink');

        // Act
        await act(async () => router.navigate(-1));

        // Assert
        expect(router.state.location.pathname).toBe('/pricing/');
        expect(output.querySelector('h1')?.textContent).toBe('Pricing');
    } finally {
        await act(async () => root.unmount());
        router.dispose();
    }
});
