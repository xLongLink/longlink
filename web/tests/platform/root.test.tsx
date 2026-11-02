// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../render';
import PlatformRoot from '@/platform/root';
import { renderToStaticMarkup } from 'react-dom/server';
import { SideNavItem } from '@astryxdesign/core/SideNav';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

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

it('uses the Platform root link provider for client-side navigation', async () => {
    // Arrange
    function Navigation() {
        const location = useLocation();

        return (
            <>
                <SideNavItem label="Orders" href="/?section=orders" />
                <output>{location.search}</output>
            </>
        );
    }

    // Act
    await withMounted(
        <Routes>
            <Route element={<PlatformRoot />}>
                <Route index element={<Navigation />} />
            </Route>
        </Routes>,
        async (output) => {
            const link = output.querySelector('a');

            expect(link?.getAttribute('href')).toBe('/?section=orders');

            await act(async () => link?.click());

            // Assert
            expect(output.querySelector('output')?.textContent).toBe('?section=orders');
        }
    );
});
