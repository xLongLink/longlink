// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { ApiError } from '@/lib/api';
import { act, useEffect } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { Route, Routes } from 'react-router';
import { ApiErrorContext } from '@/lib/errors';
import Organization from '@/platform/layouts/organization';
import { membership, TestAccountProvider } from '../render';
import Layout from '@/platform/layouts/organization-access';

function ProtectedContent({ onMount, label }: { onMount: () => void; label: string }) {
    useEffect(onMount, [onMount]);

    return <h1>{label}</h1>;
}

it.each([
    { status: 403, title: 'Unable to load solution' },
    { status: 404, title: "We can't find that page" }
])('blocks nested solution content when membership returns $status', async ({ status, title }) => {
    // Arrange
    const errors: unknown[] = [];
    const mounted = vi.fn();
    let respond!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => {
        respond = resolve;
    });
    const transport = vi.spyOn(globalThis, 'fetch').mockReturnValue(response);

    try {
        // Act
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <TestAccountProvider>
                    <Routes>
                        <Route element={<Layout />}>
                            <Route
                                path="/orgs/:organization/solutions/:solution/*"
                                element={<ProtectedContent onMount={mounted} label="Protected solution content" />}
                            />
                        </Route>
                    </Routes>
                </TestAccountProvider>
            </ApiErrorContext>,
            async (output) => {
                // Assert
                expect(output.querySelector('[aria-label="Loading solution"]')).not.toBeNull();
                expect(mounted).not.toHaveBeenCalled();
                expect(output.querySelector('nav[aria-label="Section navigation"]')).toBeNull();

                // Act
                await act(async () => respond(Response.json({ detail: 'Denied' }, { status })));

                // Assert
                await vi.waitFor(() => expect(output.querySelector('h1')?.textContent).toBe(title));
                expect(mounted).not.toHaveBeenCalled();
                expect(output.textContent).not.toContain('Protected solution content');
                expect(output.textContent).not.toContain("We couldn't load this organization.");
                expect(output.querySelector('nav[aria-label="Section navigation"]')).toBeNull();
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
    const mounted = vi.fn();
    let respond!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => {
        respond = resolve;
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;
        requests.push(`${request.method} ${path}`);

        if (request.method === 'GET' && path === base) {
            return await response;
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
                                <Route
                                    path="/orgs/:organization"
                                    element={
                                        <ProtectedContent onMount={mounted} label="Protected organization content" />
                                    }
                                />
                            </Route>
                        </Route>
                    </Routes>
                </TestAccountProvider>
            </ApiErrorContext>,
            async (output) => {
                // Assert
                expect(output.querySelector('[aria-label="Loading organization"]')).not.toBeNull();
                expect(mounted).not.toHaveBeenCalled();
                expect(output.querySelector('button[aria-label="Organization"]')).not.toBeNull();
                expect(output.querySelector('nav[aria-label="Section navigation"]')).not.toBeNull();

                // Act
                await act(async () =>
                    respond(
                        Response.json(
                            { detail: status === 403 ? 'Access denied' : 'Organization not found' },
                            { status }
                        )
                    )
                );

                // Assert
                await vi.waitFor(() => expect(output.querySelector('h1')?.textContent).toBe(title));
                expect(mounted).not.toHaveBeenCalled();
                expect(output.textContent).toContain(description);
                expect(output.textContent).not.toContain('Protected organization content');
                expect(output.querySelector('[aria-label="Loading organization"]')).toBeNull();
                expect(output.querySelector('button[aria-label="Organization"]')).toBeNull();
                expect(output.querySelector('nav[aria-label="Section navigation"]')).not.toBeNull();
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

it('mounts nested solution content only after membership is admitted', async () => {
    // Arrange
    const mounted = vi.fn();
    const reportError = vi.fn();
    let respond!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => {
        respond = resolve;
    });
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (
            request.method !== 'GET' ||
            new URL(request.url).pathname !== `/api/v1/organizations/${membership.organization.id}`
        ) {
            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        }

        return await response;
    });

    try {
        // Act
        await withMounted(
            <ApiErrorContext value={reportError}>
                <TestAccountProvider>
                    <Routes>
                        <Route element={<Layout />}>
                            <Route
                                path="/orgs/:organization/solutions/:solution/*"
                                element={<ProtectedContent onMount={mounted} label="Protected solution content" />}
                            />
                        </Route>
                    </Routes>
                </TestAccountProvider>
            </ApiErrorContext>,
            async (output) => {
                // Assert
                expect(output.querySelector('[aria-label="Loading solution"]')).not.toBeNull();
                expect(mounted).not.toHaveBeenCalled();

                // Act
                await act(async () => respond(Response.json(membership)));

                // Assert
                await vi.waitFor(() => expect(mounted).toHaveBeenCalledOnce());
                expect(output.querySelector('h1')?.textContent).toBe('Protected solution content');
                expect(output.querySelector('[aria-label="Loading solution"]')).toBeNull();
                expect(reportError).not.toHaveBeenCalled();
            },
            `/orgs/${membership.organization.id}/solutions/solution/nested`
        );
    } finally {
        transport.mockRestore();
    }
});
