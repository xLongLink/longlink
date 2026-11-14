// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { renderStatic } from '../../render';
import Layout from '@/platform/layouts/page';
import { Route, Routes } from 'react-router';

it('places routed public content between navigation and the footer', () => {
    // Act
    const output = renderStatic(
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<main>Public page</main>} />
            </Route>
        </Routes>
    );

    // Assert
    expect(output.querySelector('header')).not.toBeNull();
    expect(output.querySelector('main')?.textContent).toBe('Public page');
    expect(output.querySelector('footer')).not.toBeNull();
});
