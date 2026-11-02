// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { useApiError } from '@/lib/errors';
import SolutionRoot from '@/solution/root';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';

it('supplies the shared request error boundary to routed children', () => {
    // Arrange
    function Page() {
        useApiError();

        return <main>Resolved route</main>;
    }

    // Act
    const output = document.createElement('section');
    output.innerHTML = renderToStaticMarkup(
        <MemoryRouter>
            <Routes>
                <Route element={<SolutionRoot />}>
                    <Route path="/" element={<Page />} />
                </Route>
            </Routes>
        </MemoryRouter>
    );

    // Assert
    expect(output.querySelector('main')?.textContent).toBe('Resolved route');
});
