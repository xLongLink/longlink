// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act, useEffect } from 'react';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { DevelopmentProfile } from '@/solution/profile';
import type { DevelopmentUser } from '@/views/manifest';
import { SidebarProvider } from '@/components/shadcn/sidebar';
import { developmentCookie, getDevelopmentUser, setDevelopmentUser } from '@/solution/development';

const users: DevelopmentUser[] = [
    { role: 'auditor', user: { id: 'audit-1', name: 'Audit user', email: 'audit@example.com', teams: ['finance'] } },
    { role: 'auditor', user: { id: 'audit-2', name: 'Other auditor', email: 'other@example.com' } },
    { role: 'write', user: { id: 'writer', name: 'Write user', email: 'write@example.com' } }
];

it('installs the initial request persona before passive requests and reloads only after persisting a new persona', async () => {
    // Observe the real cookie boundary; replace only terminal document reload.
    const previousCookie = document.cookie;
    document.cookie = `${developmentCookie}=; Path=/; Max-Age=0`;
    const observedRoles: (string | undefined)[] = [];

    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {
        expect(getDevelopmentUser(users)?.role).toBe('auditor');
        expect(document.cookie).toContain(developmentCookie);
    });

    const events = userEvent.setup();

    /** Models the isolated View's passive business-request startup. */
    function BusinessRequests() {
        useEffect(() => {
            expect(document.cookie).toContain(developmentCookie);
            observedRoles.push(getDevelopmentUser(users)?.role);
        }, []);

        return null;
    }

    try {
        await withMounted(
            <>
                <SidebarProvider>
                    <DevelopmentProfile users={users} />
                </SidebarProvider>
                <BusinessRequests />
            </>,
            async (output) => {
                expect(observedRoles).toEqual(['write']);
                const trigger = output.querySelector('button');

                if (!trigger) throw new Error('Missing development trigger');
                await act(async () => await events.click(trigger));
                const popup = document.querySelector('[role="menu"]');
                expect(popup?.querySelector('a[href="/user/settings"]')).toBeNull();
                const docs = popup?.querySelector('a');
                expect(docs?.target).toBe('_blank');
                expect(docs?.relList.contains('noopener')).toBe(true);

                const auditUser = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((item) =>
                    item.textContent?.includes('audit@example.com')
                );

                if (!auditUser) throw new Error('Missing auditor persona');
                await act(async () => await events.click(auditUser));
                expect(reload).toHaveBeenCalledTimes(1);
                expect(getDevelopmentUser(users)?.user.id).toBe('audit-1');
                expect(JSON.parse(decodeURIComponent(document.cookie.split('=')[1]))).toEqual(users[0]);
                expect(observedRoles).toEqual(['write']);
            }
        );
    } finally {
        reload.mockRestore();
        document.cookie = `${developmentCookie}=; Path=/; Max-Age=0`;
        const previousPersona = previousCookie.split('; ').find((cookie) => cookie.startsWith(`${developmentCookie}=`));

        if (previousPersona) document.cookie = `${previousPersona}; Path=/; SameSite=Strict`;
    }
});

it('repairs stale identity details by ID before business requests and marks only the selected user', async () => {
    // Arrange
    setDevelopmentUser({
        role: 'obsolete',
        user: { id: 'audit-2', name: 'Old name', email: 'old@example.com', teams: ['removed'] }
    });
    const events = userEvent.setup();
    const observedUsers: unknown[] = [];

    /** Observes the identity sent across the cookie boundary at request startup. */
    function BusinessRequests() {
        useEffect(() => {
            observedUsers.push(JSON.parse(decodeURIComponent(document.cookie.split('=')[1])));
        }, []);

        return null;
    }

    try {
        // Act
        await withMounted(
            <>
                <SidebarProvider>
                    <DevelopmentProfile users={users} />
                </SidebarProvider>
                <BusinessRequests />
            </>,
            async (output) => {
                const trigger = output.querySelector('button');

                if (!trigger) throw new Error('Missing development trigger');
                await act(async () => await events.click(trigger));

                // Assert
                expect(observedUsers).toEqual([users[1]]);
                const selected = document.querySelectorAll('[role="menuitem"][aria-current="true"]');
                expect(selected).toHaveLength(1);
                expect(selected[0]?.textContent).toContain('other@example.com');
            }
        );
    } finally {
        document.cookie = `${developmentCookie}=; Path=/; Max-Age=0`;
    }
});

it.each(['%invalid', encodeURIComponent(JSON.stringify({ user: { id: 'removed-user' } }))])(
    'replaces invalid or removed selections with the first user when write is unavailable: %s',
    async (cookie) => {
        // Arrange
        document.cookie = `${developmentCookie}=${cookie}; Path=/`;

        try {
            // Act
            await withMounted(
                <SidebarProvider>
                    <DevelopmentProfile users={users.slice(0, 2)} />
                </SidebarProvider>,
                async (output) => {
                    // Assert
                    expect(output.querySelector('button')?.getAttribute('aria-label')).toBe('Audit user');
                    expect(JSON.parse(decodeURIComponent(document.cookie.split('=')[1]))).toEqual(users[0]);
                }
            );
        } finally {
            document.cookie = `${developmentCookie}=; Path=/; Max-Age=0`;
        }
    }
);
