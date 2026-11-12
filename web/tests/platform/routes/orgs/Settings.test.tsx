// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import type { z } from 'zod';
import * as icons from '@/lib/icons';
import { it, expect, vi } from 'vitest';
import { useApi } from '@/lib/hooks/use-api';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import { Link, Route, Routes } from 'react-router';
import userEvent from '@testing-library/user-event';
import { ApiBoundary } from '@/components/ApiBoundary';
import Settings from '@/platform/routes/orgs/Settings';
import { LinkProvider } from '@/components/astryx/Link';
import Organization from '@/platform/layouts/Organization';
import { IconRequestContext } from '@/components/ui/contexts';
import { renderPlatform, membership, user } from '../../render';
import { AuthenticatedUserContext } from '@/lib/hooks/use-user';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import OrganizationAccess from '@/platform/layouts/OrganizationAccess';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type OrganizationMemberAccessResponse = z.output<typeof schemas.zOrganizationMemberAccessResponse>;

type UserOrganizationMembership = z.output<typeof schemas.zUserOrganizationMembership>;

const base = `/api/v1/organizations/${membership.organization.id}`;

const members = schemas.zOrganizationMemberAccessResponse.array().parse([
    { user, role: 'owner' },
    {
        user: { id: '00000000-0000-4000-8000-000000000003', name: 'Mina', email: 'mina@example.com', avatar: '' },
        role: 'read',
    },
    {
        user: { id: '00000000-0000-4000-8000-000000000004', name: 'Noah', email: 'noah@example.com', avatar: '' },
        role: 'write',
    },
]);

/** Observes the account's independently cached organization list alongside its settings. */
function AccountRole() {
    const [organizations] = useApi('/api/v1/me/organizations', schemas.zUserOrganizationMembership.array());

    return <output aria-label="Account organization role">{organizations[0]?.role}</output>;
}

/** Mounts the real membership boundary so refreshed permissions reach the settings controls. */
async function withOrganizationSettings(
    access: UserOrganizationMembership,
    memberRows: OrganizationMemberAccessResponse[],
    check: (output: HTMLElement, client: QueryClient) => Promise<void>,
    fragment = 'members'
) {
    const errors: unknown[] = [];

    const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnMount: false } },
    });

    client.setQueryData(['api', base], access);
    client.setQueryData(['api', `${base}/tags`], []);
    client.setQueryData(['api', `${base}/members`], memberRows);
    client.setQueryData(['api', `${base}/invitations`], []);
    client.setQueryData(['api', '/api/v1/me/organizations'], [access]);

    try {
        await withMounted(
            <QueryClientProvider client={client}>
                <ApiErrorContext value={(error) => errors.push(error)}>
                    <AuthenticatedUserContext value={user}>
                        <IconRequestContext value={icons.load}>
                            <LinkProvider component={Link}>
                                <ApiBoundary>
                                    <AccountRole />
                                </ApiBoundary>
                                <Routes>
                                    <Route path="/user/organizations" element={<h1>Organizations overview</h1>} />
                                    <Route element={<OrganizationAccess />}>
                                        <Route element={<Organization />}>
                                            <Route path="/orgs/:organization/settings" element={<Settings />} />
                                        </Route>
                                    </Route>
                                </Routes>
                            </LinkProvider>
                        </IconRequestContext>
                    </AuthenticatedUserContext>
                </ApiErrorContext>
            </QueryClientProvider>,
            async (output) => check(output, client),
            `/orgs/${access.organization.id}/settings#${fragment}`
        );
        expect(errors).toEqual([]);
    } finally {
        client.clear();
    }
}

/** Chooses a member action through its row menu rather than invoking callbacks directly. */
async function chooseMemberAction(output: HTMLElement, name: string, label: string) {
    const row = Array.from(output.querySelectorAll('tbody tr')).find((row) => row.textContent?.includes(name));
    const menu = row?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');

    if (!menu) throw new Error(`Expected actions for ${name}`);

    await act(async () => menu.click());

    const popup = document.getElementById(menu.getAttribute('aria-controls') ?? '');

    if (!popup) throw new Error(`Expected the open menu for ${name}`);

    const action = Array.from(popup.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((item) =>
        item.textContent?.includes(label)
    );

    if (!action) throw new Error(`Expected member action ${label}`);

    await act(async () => action.click());
}

it('renders General without loading inactive billing or registry resources', () => {
    // Act
    const output = renderPlatform(
        <Settings />,
        `/orgs/${membership.organization.id}/settings`,
        [],
        '/orgs/:organization/settings',
        {
            ...membership,
            tags: [],
            activeTag: undefined,
        }
    );

    // Assert
    expect(output.textContent).toContain('Acme');
    expect(output.textContent).toContain('General');
    expect(output.textContent).toContain('Tabs');
    expect(output.querySelector('table')).not.toBeNull();
});

it('refreshes current membership and account permissions after self-demotion', async () => {
    // Arrange
    const access = { ...membership, role: 'admin' } satisfies UserOrganizationMembership;
    const updatedAccess = { ...membership, role: 'read' } satisfies UserOrganizationMembership;

    const accessMembers = [
        { user, role: 'admin' },
        members[1],
        { ...members[2], role: 'owner' },
    ] satisfies OrganizationMemberAccessResponse[];

    const requests: string[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;
        requests.push(`${request.method} ${path}`);

        if (request.method === 'PATCH' && path === `${base}/members/${user.id}`) {
            expect(await request.json()).toEqual({ role: 'read' });

            return new Response(null, { status: 204 });
        }

        if (request.method === 'GET' && path === `${base}/members`) {
            return Response.json([{ user, role: 'read' }, ...accessMembers.slice(1)]);
        }

        if (request.method === 'GET' && path === base) return Response.json(updatedAccess);

        if (request.method === 'GET' && path === '/api/v1/me/organizations') return Response.json([updatedAccess]);

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withOrganizationSettings(access, accessMembers, async (output) => {
            expect(output.querySelector('thead')?.textContent).toContain('Actions');
            expect(output.querySelector('output[aria-label="Account organization role"]')?.textContent).toBe('admin');

            // Act
            await chooseMemberAction(output, user.name, 'Set as Read');

            const confirm = Array.from(document.querySelectorAll<HTMLButtonElement>('dialog[open] button')).find(
                (button) => button.textContent === 'Confirm'
            );

            if (!confirm) throw new Error('Expected the role-change confirmation');

            await act(async () => confirm.click());

            // Assert
            await vi.waitFor(() =>
                expect(output.querySelector('output[aria-label="Account organization role"]')?.textContent).toBe('read')
            );
            await vi.waitFor(() => expect(output.querySelector('thead')?.textContent).not.toContain('Actions'));
            expect(output.querySelector('table button[aria-haspopup="menu"]')).toBeNull();
            await vi.waitFor(() => expect(document.querySelector('dialog[open]')).toBeNull());
            expect(requests).toEqual(
                expect.arrayContaining([
                    `PATCH ${base}/members/${user.id}`,
                    `GET ${base}/members`,
                    `GET ${base}`,
                    'GET /api/v1/me/organizations',
                ])
            );
        });
    } finally {
        transport.mockRestore();
    }
});

it('keeps a replacement member confirmation open when an older action completes', async () => {
    // Arrange
    const requests: string[] = [];
    let finishChange: (response: Response) => void = () => undefined;

    const pendingChange = new Promise<Response>((resolve) => {
        finishChange = resolve;
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;
        requests.push(`${request.method} ${path}`);

        if (request.method === 'PATCH' && path === `${base}/members/${members[1].user.id}`) return pendingChange;

        if (request.method === 'GET' && path === `${base}/members`) {
            return Response.json([members[0], { ...members[1], role: 'write' }, members[2]]);
        }

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withOrganizationSettings(membership, members, async (output) => {
            // Act
            await chooseMemberAction(output, 'Mina', 'Set as Write');

            const confirm = Array.from(document.querySelectorAll<HTMLButtonElement>('dialog[open] button')).find(
                (button) => button.textContent === 'Confirm'
            );

            if (!confirm) throw new Error('Expected the first role-change confirmation');

            await act(async () => confirm.click());
            await vi.waitFor(() => expect(requests).toContain(`PATCH ${base}/members/${members[1].user.id}`));

            const cancel = Array.from(document.querySelectorAll<HTMLButtonElement>('dialog[open] button')).find(
                (button) => button.textContent === 'Cancel'
            );

            if (!cancel) throw new Error('Expected the pending action to remain dismissible');

            await act(async () => cancel.click());
            await vi.waitFor(() => expect(document.querySelector('dialog[open]')).toBeNull());
            await chooseMemberAction(output, 'Noah', 'Set as Read');
            expect(document.querySelector('dialog[open]')?.textContent).toContain('Change Noah to read?');

            await act(async () => finishChange(new Response(null, { status: 204 })));

            // Assert
            await vi.waitFor(() => expect(requests).toContain(`GET ${base}/members`));
            await vi.waitFor(() =>
                expect(
                    Array.from(output.querySelectorAll('tbody tr')).find((row) => row.textContent?.includes('Mina'))
                        ?.textContent
                ).toContain('write')
            );

            const replacement = document.querySelector('dialog[open]');
            expect(replacement).not.toBeNull();
            expect(replacement?.textContent).toContain('Change Noah to read?');
            expect(requests).not.toContain(`PATCH ${base}/members/${members[2].user.id}`);
            expect(requests).not.toContain(`GET ${base}`);
            expect(requests).not.toContain('GET /api/v1/me/organizations');
        });
    } finally {
        finishChange(new Response(null, { status: 204 }));
        transport.mockRestore();
    }
});

it.each([
    { fragment: 'general', group: 'Organization' },
    { fragment: 'members', group: 'People' },
])('keeps the selected $fragment settings link visible on arrival', async ({ fragment, group }) => {
    // Act
    await withOrganizationSettings(
        membership,
        members,
        async (output) => {
            const disclosure = Array.from(output.querySelectorAll('button[aria-expanded]')).find(
                (button) => button.textContent === group
            );

            const selected = output.querySelector(`a[href$="#${fragment}"][aria-current="page"]`);

            // Assert
            expect(disclosure?.getAttribute('aria-expanded')).toBe('true');
            expect(selected).not.toBeNull();
            expect(selected?.closest('[inert], [hidden]')).toBeNull();
        },
        fragment
    );
});

it.each(['admin', 'owner'] as const)('leaves revoked organization access after self-removal as %s', async (role) => {
    // Arrange
    const access = { ...membership, role };

    const accessMembers = [
        { user, role },
        members[1],
        { ...members[2], role: 'owner' },
    ] satisfies OrganizationMemberAccessResponse[];

    const requests: string[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;
        requests.push(`${request.method} ${path}`);

        if (request.method === 'DELETE' && path === `${base}/members/${user.id}`) {
            return new Response(null, { status: 204 });
        }

        if (request.method === 'GET' && path === '/api/v1/me/organizations') return Response.json([]);

        throw new Error(`Unexpected request after access revocation: ${request.method} ${path}`);
    });

    try {
        await withOrganizationSettings(access, accessMembers, async (output, client) => {
            // Act
            await chooseMemberAction(output, user.name, 'Remove member');

            const confirm = Array.from(document.querySelectorAll<HTMLButtonElement>('dialog[open] button')).find(
                (button) => button.textContent === 'Remove member'
            );

            if (!confirm) throw new Error('Expected the self-removal confirmation');

            await act(async () => confirm.click());

            // Assert
            await vi.waitFor(() => expect(output.querySelector('h1')?.textContent).toBe('Organizations overview'));
            await vi.waitFor(() =>
                expect(output.querySelector('output[aria-label="Account organization role"]')?.textContent).toBe('')
            );
            expect(client.getQueryData(['api', base])).toBeUndefined();
            expect(output.querySelector('table')).toBeNull();
            expect(document.querySelector('dialog[open]')).toBeNull();
            expect(requests).toEqual([`DELETE ${base}/members/${user.id}`, 'GET /api/v1/me/organizations']);
        });
    } finally {
        transport.mockRestore();
    }
});

it('does not dismiss a reopened invitation dialog when an earlier submission completes', async () => {
    // Arrange
    const invitation = schemas.zOrganizationInvitationResponse.parse({
        id: '00000000-0000-4000-8000-000000000005',
        email: 'first@example.com',
        role: 'write',
        created_at: '2026-10-02T00:00:00Z',
    });

    const requests: string[] = [];
    let finishInvitation: (response: Response) => void = () => undefined;

    const pendingInvitation = new Promise<Response>((resolve) => {
        finishInvitation = resolve;
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        const path = new URL(request.url).pathname;
        requests.push(`${request.method} ${path}`);

        if (request.method === 'POST' && path === `${base}/invitations`) {
            expect(await request.json()).toEqual({ email: 'first@example.com', role: 'write' });

            return pendingInvitation;
        }

        if (request.method === 'GET' && path === `${base}/invitations`) return Response.json([invitation]);

        throw new Error(`Unexpected request: ${request.method} ${path}`);
    });

    try {
        await withOrganizationSettings(
            membership,
            members,
            async (output) => {
                const events = userEvent.setup();

                const open = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Invite'
                );

                if (!open) throw new Error('Expected the invitation action');

                // Act
                await act(async () => open.click());

                const form = document.querySelector<HTMLFormElement>('dialog[open] form');
                const email = form?.querySelector<HTMLInputElement>('input[name="email"]');
                const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');

                if (!form || !email || !submit) throw new Error('Expected the invitation form');

                await act(async () => {
                    await events.type(email, 'first@example.com');
                    await events.click(submit);
                });

                await vi.waitFor(() => expect(requests).toContain(`POST ${base}/invitations`));

                const close = document.querySelector<HTMLButtonElement>(
                    'dialog[open] button[aria-label="Close dialog"]'
                );

                if (!close) throw new Error('Expected the pending form to remain dismissible');

                await act(async () => close.click());
                await vi.waitFor(() => expect(document.querySelector('dialog[open]')).toBeNull());
                await act(async () => open.click());
                expect(document.querySelector('dialog[open]')?.textContent).toContain('Invite user');

                await act(async () => finishInvitation(new Response(null, { status: 204 })));

                // Assert
                await vi.waitFor(() =>
                    expect(output.querySelector('table')?.textContent).toContain('first@example.com')
                );

                const replacement = document.querySelector('dialog[open]');
                expect(replacement).not.toBeNull();
                expect(replacement?.textContent).toContain('Invite user');
                await vi.waitFor(() =>
                    expect(document.querySelector<HTMLFieldSetElement>('dialog[open] fieldset')?.disabled).toBe(false)
                );
                expect(requests).toEqual([`POST ${base}/invitations`, `GET ${base}/invitations`]);
            },
            'invitations'
        );
    } finally {
        finishInvitation(new Response(null, { status: 204 }));
        transport.mockRestore();
    }
});
