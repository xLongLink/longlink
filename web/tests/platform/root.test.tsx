// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import PlatformRoot from '@/platform/root';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';

it('retains the routed Platform content within shared providers', () => {
    // Act
    const output = document.createElement('section');
    output.innerHTML = renderToStaticMarkup(
        <MemoryRouter>
            <Routes>
                <Route element={<PlatformRoot />}>
                    <Route path="/" element={<main>Platform page</main>} />
                </Route>
            </Routes>
        </MemoryRouter>
    );

    // Assert
    expect(output.querySelector('main')?.textContent).toBe('Platform page');
});
