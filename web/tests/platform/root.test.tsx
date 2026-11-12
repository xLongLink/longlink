// @vitest-environment happy-dom
import { act } from 'react';
import { it, expect } from 'vitest';
import { withMounted } from '../render';
import PlatformRoot from '@/platform/root';
import { SideNavItem } from '@/components/astryx/SideNav';
import { Route, Routes, useLocation } from 'react-router';

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
