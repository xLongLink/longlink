// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import PlatformRoot from '@/platform/root';
import { Route, Routes } from 'react-router';
import Page from '@/platform/routes/public-solution';

it('recovers a failed public metadata read through the root boundary without requiring an account', async () => {
    // Arrange
    const solutionId = '00000000-0000-4000-8000-000000000003';
    let available = false;
    const requests: string[] = [];
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;
        requests.push(path);

        if (path === '/api/v1/me') return Response.json({ detail: 'Not authenticated' }, { status: 401 });
        if (path === `/api/v1/public/solutions/${solutionId}`) {
            if (!available) return Response.json({ detail: 'Not found' }, { status: 404 });

            return Response.json({
                id: solutionId,
                name: 'Public orders',
                description: null,
                status: 'running',
                public: true,
                deployed_version: null,
                organization: { id: '00000000-0000-4000-8000-000000000004', name: 'Acme' }
            });
        }
        if (path === `/api/v1/public/solutions/${solutionId}/proxy/views.json`) {
            return Response.json({ views: [], runtime: { version: 'a'.repeat(64) } });
        }

        throw new Error(`Unexpected request: ${path}`);
    });

    try {
        await withMounted(
            <Routes>
                <Route element={<PlatformRoot />}>
                    <Route path="/explore/solutions/:solution/*" element={<Page />} />
                </Route>
            </Routes>,
            async (output) => {
                await vi.waitFor(() => expect(output.textContent).toContain('Unable to load this page.'));
                const retry = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Retry'
                );
                if (!retry) throw new Error('Expected a retry action');

                // Act
                available = true;
                await act(async () => retry.click());

                // Assert
                await vi.waitFor(() => {
                    expect(output.textContent).toContain('Public orders');
                    expect(output.querySelector('a[href="/login/"]')?.textContent).toContain('Sign In');
                    expect(output.textContent).toContain('The solution did not expose any views to render.');
                });
                expect(requests.some((path) => path.includes('/organizations'))).toBe(false);
            },
            `/explore/solutions/${solutionId}`
        );
    } finally {
        transport.mockRestore();
    }
});
