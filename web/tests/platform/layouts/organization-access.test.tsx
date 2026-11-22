// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { ApiError } from '@/lib/api';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { Route, Routes } from 'react-router';
import { ApiErrorContext } from '@/lib/errors';
import Organization from '@/platform/layouts/organization';
import { membership, TestAccountProvider } from '../render';
import Layout from '@/platform/layouts/organization-access';

it.each([
    { status: 403, title: 'Unable to load solution' },
    { status: 404, title: "We can't find that page" }
])('blocks nested solution content when membership returns $status', async ({ status, title }) => {
    // Arrange
    const errors: unknown[] = [];
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ detail: 'Denied' }, { status }));

    try {
        // Act
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <TestAccountProvider>
                    <Routes>
                        <Route element={<Layout />}>
                            <Route
                                path="/orgs/:organization/solutions/:solution/*"
                                element={<h1>Protected solution content</h1>}
                            />
                        </Route>
                    </Routes>
                </TestAccountProvider>
            </ApiErrorContext>,
            async (output) => {
                // Assert
                await vi.waitFor(() => expect(output.querySelector('h1')?.textContent).toBe(title));
                expect(output.textContent).not.toContain('Protected solution content');
                expect(output.textContent).not.toContain("We couldn't load this organization.");
                expect(errors).toHaveLength(1);
                expect(errors[0]).toMatchObject({ status });
            },
            `/orgs/${membership.organization.id}/solutions/solution/nested`
        );
    } finally {
        transport.mockRestore();
    }
});

it.each([
    { status: 403, title: 'Unable to load organization', description: "We couldn't load this organization." },
    { status: 404, title: "We can't find that page", description: "This page doesn't exist or isn't available." }
])('blocks nested organization content when membership returns $status', async ({ status, title, description }) => {
    // Arrange
    const base = `/api/v1/organizations/${membership.organization.id}`;
    const requests: string[] = [];
    const errors: unknown[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;
        requests.push(`${request.method} ${path}`);

        if (request.method === 'GET' && path === base) {
            return Response.json({ detail: status === 403 ? 'Access denied' : 'Organization not found' }, { status });
        }

        if (request.method === 'GET' && path === `${base}/tags`) return Response.json([]);

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        // Act
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <TestAccountProvider>
                    <Routes>
                        <Route element={<Layout />}>
                            <Route element={<Organization />}>
                                <Route path="/orgs/:organization" element={<h1>Protected organization content</h1>} />
                            </Route>
                        </Route>
                    </Routes>
                </TestAccountProvider>
            </ApiErrorContext>,
            async (output) => {
                // Assert
                await vi.waitFor(() => expect(output.querySelector('h1')?.textContent).toBe(title));
                expect(output.textContent).toContain(description);
                expect(output.textContent).not.toContain('Protected organization content');
                expect(output.textContent).not.toContain('Loading organization');
                expect(requests).toEqual([`GET ${base}`]);
                expect(errors).toHaveLength(1);
                expect(errors[0]).toBeInstanceOf(ApiError);
                expect(errors[0]).toMatchObject({ status, url: `http://localhost${base}` });
            },
            `/orgs/${membership.organization.id}`
        );
    } finally {
        transport.mockRestore();
    }
});
