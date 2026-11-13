// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { ApiError } from '@/lib/api';
import * as icons from '@/lib/icons';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { Route, Routes } from 'react-router';
import { ApiErrorContext } from '@/lib/errors';
import Organization from '@/platform/layouts/Organization';
import Layout from '@/platform/layouts/OrganizationAccess';
import { renderPlatform, membership, user } from '../render';
import { IconRequestContext } from '@/components/ui/contexts';
import { AuthenticatedUserContext } from '@/lib/hooks/use-user';

it('keeps unresolved organization reads behind their loading boundary', () => {
    // Act
    const output = renderPlatform(<Layout />, '/orgs/00000000-0000-4000-8000-000000000002', [], '/orgs/:organization');

    // Assert
    expect(output.textContent).toContain('Loading organization');
});

it.each([
    { status: 403, title: 'Unable to load organization', description: "We couldn't load this organization." },
    { status: 404, title: "We can't find that page", description: "This page doesn't exist or isn't available." },
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
                <AuthenticatedUserContext value={user}>
                    <IconRequestContext value={icons.load}>
                        <Routes>
                            <Route element={<Layout />}>
                                <Route element={<Organization />}>
                                    <Route
                                        path="/orgs/:organization"
                                        element={<h1>Protected organization content</h1>}
                                    />
                                </Route>
                            </Route>
                        </Routes>
                    </IconRequestContext>
                </AuthenticatedUserContext>
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
