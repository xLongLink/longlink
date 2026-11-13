// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { withMounted } from '../render';
import { it, expect, vi } from 'vitest';
import { user } from '../platform/render';
import { useLocation } from 'react-router';
import { SidebarContext } from '@/lib/sidebar';
import { ProfileMenu } from '@/components/profile';
import userEvent from '@testing-library/user-event';
import { AuthenticatedUserContext } from '@/lib/hooks/use-user';

/** Observes real Router navigation without replacing its link behavior. */
function Location() {
    const location = useLocation();

    return <output aria-label="Current route">{location.pathname}</output>;
}

/** Finds the actionable profile control, including controls rendered in a portal. */
function button(label: string) {
    const control = Array.from(document.querySelectorAll('button')).find(
        (element) => element.getAttribute('aria-label') === label || element.textContent === label
    );

    if (!control) throw new Error(`Missing button: ${label}`);

    return control;
}

it.each([false, true])(
    'keeps account navigation in the SPA and gates administrator actions (%s)',
    async (administrator) => {
        // A real regular user must not receive administrator destinations; both actors retain native link gestures.
        const events = userEvent.setup();
        await withMounted(
            <AuthenticatedUserContext value={{ ...user, administrator }}>
                <SidebarContext value="expanded">
                    <ProfileMenu />
                </SidebarContext>
                <Location />
            </AuthenticatedUserContext>,
            async (output) => {
                await act(async () => await events.click(button('Owner')));
                const popup = document.querySelector('[role="dialog"]');
                expect(popup).not.toBeNull();
                expect(Boolean(popup?.querySelector('[aria-label="Administration"]'))).toBe(administrator);
                expect(Boolean(popup?.querySelector('a[href="/admin/users"]'))).toBe(administrator);

                const settings = popup?.querySelector<HTMLAnchorElement>('a[href="/user/settings"]');

                if (!settings) throw new Error('Missing settings link');

                // Modified activation stays a native anchor action instead of navigating the current Router.
                const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
                await act(async () => settings.dispatchEvent(modified));
                expect(modified.defaultPrevented).toBe(false);
                expect(output.querySelector('output')?.textContent).toBe('/');
                expect(button('Owner').getAttribute('aria-expanded')).toBe('false');

                await act(async () => await events.click(button('Owner')));
                const documentation = document.querySelector<HTMLAnchorElement>('a[href="/docs/"]');
                expect(documentation?.target).toBe('_blank');
                expect(documentation?.relList.contains('noopener')).toBe(true);
                expect(documentation?.relList.contains('noreferrer')).toBe(true);

                const href = administrator ? '/admin/users' : '/user/settings';
                const destination = document.querySelector<HTMLAnchorElement>(`a[href="${href}"]`);

                if (!destination) throw new Error('Missing destination link');
                await act(async () => await events.click(destination));
                expect(output.querySelector('output')?.textContent).toBe(href);
                expect(button('Owner').getAttribute('aria-expanded')).toBe('false');
            }
        );
    }
);

it('dismisses by keyboard and outside interaction and restores trigger focus', async () => {
    const events = userEvent.setup();
    await withMounted(
        <AuthenticatedUserContext value={user}>
            <ProfileMenu />
            <button type="button">Outside</button>
        </AuthenticatedUserContext>,
        async () => {
            await act(async () => {
                button('Owner').focus();
                await events.keyboard('{Enter}');
            });
            expect(document.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
            await act(async () => await events.tab({ shift: true }));
            expect(document.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
            await act(async () => await events.keyboard('{Escape}'));
            expect(button('Owner').getAttribute('aria-expanded')).toBe('false');
            expect(document.activeElement).toBe(button('Owner'));
            await act(async () => await events.click(button('Owner')));
            await act(async () => await events.click(button('Outside')));
            expect(button('Owner').getAttribute('aria-expanded')).toBe('false');
            expect(document.activeElement).toBe(button('Outside'));

            await act(async () => {
                await events.pointer([
                    { keys: '[TouchA>]', target: button('Owner') },
                    { keys: '[/TouchA]', target: button('Owner') }
                ]);
            });
            expect(button('Owner').getAttribute('aria-expanded')).toBe('true');
            await act(async () => button('Close profile menu').click());
            expect(button('Owner').getAttribute('aria-expanded')).toBe('false');
        }
    );
});

it('closes logout urgently, retains the session preference on denial, and retries without duplicate writes', async () => {
    // Replace only the HTTP transport and terminal document navigation; authentication/logout code stays real.
    const events = userEvent.setup();
    let respond: (response: Response) => void = () => undefined;

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () =>
            await new Promise<Response>((resolve) => {
                respond = resolve;
            })
    );

    const previousAppearance = localStorage.getItem('longlink:appearance');
    const appearance = JSON.stringify({ theme: 'dark', accent: 'neutral' });
    localStorage.setItem('longlink:appearance', appearance);

    const navigate = vi.spyOn(window.location, 'assign').mockImplementation(() => {
        expect(localStorage.getItem('longlink:appearance')).toBeNull();
    });

    try {
        await withMounted(
            <AuthenticatedUserContext value={user}>
                <ProfileMenu />
            </AuthenticatedUserContext>,
            async () => {
                await act(async () => await events.click(button('Owner')));
                const signOut = button('Sign out');
                await act(async () => {
                    signOut.click();
                    signOut.click();
                });
                expect(button('Owner').getAttribute('aria-expanded')).toBe('false');
                expect(transport).toHaveBeenCalledTimes(1);
                expect(navigate).not.toHaveBeenCalled();
                expect(localStorage.getItem('longlink:appearance')).toBe(appearance);

                await act(async () => await events.click(button('Owner')));
                expect(button('Signing out…').disabled).toBe(true);
                await act(async () => respond(Response.json({ detail: 'Logout denied' }, { status: 403 })));
                await vi.waitFor(() =>
                    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Sign out failed')
                );
                expect(localStorage.getItem('longlink:appearance')).toBe(appearance);
                expect(navigate).not.toHaveBeenCalled();

                const retry = button('Retry sign out');
                await act(async () => {
                    retry.click();
                    retry.click();
                });
                expect(button('Owner').getAttribute('aria-expanded')).toBe('false');
                expect(transport).toHaveBeenCalledTimes(2);
                expect(localStorage.getItem('longlink:appearance')).toBe(appearance);
                expect(navigate).not.toHaveBeenCalled();
                await act(async () => respond(new Response(null, { status: 204 })));
                await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/user/organizations'));
                expect(localStorage.getItem('longlink:appearance')).toBeNull();

                const requests = transport.mock.calls.map(([request]) => {
                    if (!(request instanceof Request)) throw new Error('Expected an authenticated API request');

                    return request;
                });

                expect(
                    requests.map((request) => [new URL(request.url).pathname, request.method, request.credentials])
                ).toEqual([
                    ['/api/v1/auth/logout', 'POST', 'include'],
                    ['/api/v1/auth/logout', 'POST', 'include']
                ]);
            }
        );
    } finally {
        transport.mockRestore();
        navigate.mockRestore();

        if (previousAppearance === null) localStorage.removeItem('longlink:appearance');
        else localStorage.setItem('longlink:appearance', previousAppearance);
    }
});
