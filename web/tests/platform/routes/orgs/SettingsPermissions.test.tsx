// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect } from 'vitest';
import * as icons from '@/lib/icons';
import { ApiErrorContext } from '@/lib/errors';
import { membership, user } from '../../render';
import { Outlet, Route, Routes } from 'react-router';
import Settings from '@/platform/routes/orgs/Settings';
import { renderStatic, withMounted } from '../../../render';
import { AuthenticatedUserContext } from '@/lib/hooks/use-user';
import { IconRequestContext } from '@/components/custom/contexts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OrganizationContext } from '@/platform/layouts/Organization';

const base = `/api/v1/organizations/${membership.organization.id}`;

const path = `/orgs/${membership.organization.id}/settings`;

const caller = { ...user, name: 'Caller', email: 'caller@example.com' };

const owner = {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Organization owner',
    email: 'owner@example.com',
    avatar: ''
};

/** Supplies the resolved caller identity without mounting unrelated organization queries. */
function settingsFor(role: OrganizationContext['role']) {
    const access = { ...membership, role, tags: [], activeTag: undefined } satisfies OrganizationContext;

    return (
        <ApiErrorContext
            value={(error) => {
                throw error;
            }}
        >
            <AuthenticatedUserContext value={caller}>
                <IconRequestContext value={icons.load}>
                    <Routes>
                        <Route element={<Outlet context={access} />}>
                            <Route path="/orgs/:organization/settings" element={<Settings />} />
                        </Route>
                    </Routes>
                </IconRequestContext>
            </AuthenticatedUserContext>
        </ApiErrorContext>
    );
}

/** Finds the rendered actions for an existing member, never a missing row. */
function memberActions(output: HTMLElement, email: string) {
    // Find the member before inspecting its actions.
    const row = Array.from(output.querySelectorAll('tbody tr')).find((row) => row.textContent?.includes(email));

    if (!row) throw new Error(`Expected member ${email}`);

    return row.querySelector('button[aria-haspopup="menu"]');
}

it('hides owner actions from admins while keeping actions for nonowners', () => {
    // Arrange
    const reader = {
        ...owner,
        id: '00000000-0000-4000-8000-000000000004',
        name: 'Reader',
        email: 'reader@example.com'
    };

    const writer = {
        ...owner,
        id: '00000000-0000-4000-8000-000000000005',
        name: 'Writer',
        email: 'writer@example.com'
    };

    const maintainer = {
        ...owner,
        id: '00000000-0000-4000-8000-000000000006',
        name: 'Maintainer',
        email: 'maintainer@example.com'
    };

    // Act
    const output = renderStatic(settingsFor('admin'), `${path}#members`, [
        [
            `${base}/members`,
            [
                { user: caller, role: 'admin' },
                { user: owner, role: 'owner' },
                { user: reader, role: 'read' },
                { user: writer, role: 'write' },
                { user: maintainer, role: 'maintain' }
            ]
        ]
    ]);

    // Assert
    expect(memberActions(output, owner.email)).toBeNull();
    expect(memberActions(output, caller.email)).not.toBeNull();
    expect(memberActions(output, reader.email)).not.toBeNull();
    expect(memberActions(output, writer.email)).not.toBeNull();
    expect(memberActions(output, maintainer.email)).not.toBeNull();
});

it.each([
    { target: 'the sole owner', rows: [{ user: caller, role: 'owner' }], email: caller.email },
    {
        target: 'another owner',
        rows: [
            { user: caller, role: 'owner' },
            { user: owner, role: 'owner' }
        ],
        email: owner.email
    }
])('keeps owner actions available to an owner targeting $target', ({ rows, email }) => {
    // Act
    const output = renderStatic(settingsFor('owner'), `${path}#members`, [[`${base}/members`, rows]]);

    // Assert
    expect(memberActions(output, email)).not.toBeNull();
});

it.each([
    { role: 'maintain', options: ['read', 'write', 'maintain'] },
    { role: 'admin', options: ['read', 'write', 'maintain', 'admin'] },
    { role: 'owner', options: ['read', 'write', 'maintain', 'admin'] }
] as const)('offers only permitted invitation roles to $role callers', async ({ role, options }) => {
    // Arrange
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnMount: false } } });

    client.setQueryData(['api', `${base}/invitations`], []);

    try {
        await withMounted(
            <QueryClientProvider client={client}>{settingsFor(role)}</QueryClientProvider>,
            async (output) => {
                // Act
                const invite = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Invite' && !button.closest('[role="dialog"]')
                );

                if (!invite) throw new Error('Expected the invitation button');

                await act(async () => invite.click());

                const selector = document.querySelector<HTMLButtonElement>('[role="dialog"] [role="combobox"]');

                if (!selector) throw new Error('Expected the invitation role selector');

                await act(async () => selector.click());

                const listbox = document.getElementById(selector.getAttribute('aria-controls') ?? '');

                if (!listbox) throw new Error('Expected the open role options');

                // Assert
                expect(selector.getAttribute('aria-expanded')).toBe('true');
                expect(
                    Array.from(listbox.querySelectorAll('[role="option"]'), (option) => option.textContent?.trim())
                ).toEqual(options);
            },
            `${path}#invitations`
        );
    } finally {
        client.clear();
    }
});

it.each(['read', 'write'] as const)('does not offer invitations to %s callers', (role) => {
    // Act
    const output = renderStatic(settingsFor(role), `${path}#invitations`, [[`${base}/invitations`, []]]);

    // Assert
    expect(output.querySelector('h2')?.textContent).toBe('Invitations');
    expect(
        Array.from(output.querySelectorAll('button')).find(
            (button) => button.textContent === 'Invite' && !button.closest('[role="dialog"]')
        )
    ).toBeUndefined();
});
