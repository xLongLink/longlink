// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { useEffect } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { Route, Routes } from 'react-router';
import Layout from '@/platform/layouts/admin';
import { ErrorBoundary } from 'react-error-boundary';
import { TestAccountProvider, user } from '../render';

function ProtectedAdmin({ onMount }: { onMount: () => void }) {
    useEffect(onMount, [onMount]);

    return <p>Protected administration</p>;
}

it.each([false, true])(
    'admits nested administration only for administrators (administrator: %s)',
    async (administrator) => {
        // Arrange
        const mounted = vi.fn();

        // Act
        await withMounted(
            <TestAccountProvider account={{ ...user, administrator }}>
                <ErrorBoundary fallback={<p>Unexpected error</p>}>
                    <Routes>
                        <Route element={<Layout />}>
                            <Route path="/admin/users" element={<ProtectedAdmin onMount={mounted} />} />
                        </Route>
                    </Routes>
                </ErrorBoundary>
            </TestAccountProvider>,
            async (output) => {
                // Assert
                if (!administrator) {
                    expect(output.querySelector('h1')?.textContent).toBe("We can't find that page");
                    expect(mounted).not.toHaveBeenCalled();
                    expect(output.textContent).not.toContain('Protected administration');
                    expect(output.querySelector('a[href="/admin/compute"]')).toBeNull();
                    expect(output.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
                    return;
                }

                expect(mounted).toHaveBeenCalledOnce();
                expect(output.textContent).toContain('Protected administration');
                expect(output.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')).not.toBeNull();
                expect(output.querySelector('a[href="/admin/compute"]')).not.toBeNull();
            },
            '/admin/users'
        );
    }
);
