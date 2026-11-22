// @vitest-environment happy-dom
import { Users } from 'lucide-react';
import { act, useState } from 'react';
import type { Window } from 'happy-dom';
import { withMounted } from '../../render';
import userEvent from '@testing-library/user-event';
import Platform from '@/components/layouts/platform';
import { useLocation, useNavigate } from 'react-router';
import { it, expect, afterEach, beforeEach } from 'vitest';

// SAFETY: The configured happy-dom environment supplies this viewport API on its window.
const viewport = (window as typeof window & Pick<Window, 'happyDOM'>).happyDOM;

const initialViewport = { width: window.innerWidth, height: window.innerHeight };

const initialMotion = viewport.settings.device.prefersReducedMotion;

beforeEach(() => {
    viewport.settings.device.prefersReducedMotion = 'reduce';
});

afterEach(() => {
    viewport.setViewport(initialViewport);
    viewport.settings.device.prefersReducedMotion = initialMotion;
});

it('uses the sidebar and selects the longest nested route with a trailing slash', async () => {
    // Arrange
    viewport.setViewport({ width: 1280 });

    // Act
    await withMounted(
        <Platform
            action={<button>Account</button>}
            tabs={[
                { href: '/admin', label: 'Overview' },
                { href: '/admin/users', label: 'Users' },
                { href: '/admin/users/active/', label: 'Active users' }
            ]}
        >
            <h1>User details</h1>
        </Platform>,
        async (output) => {
            // Assert
            expect(output.querySelector('nav[aria-label="Section navigation"]')).not.toBeNull();
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
            expect(Array.from(output.querySelectorAll('a[aria-current]'), (link) => link.getAttribute('href'))).toEqual(
                ['/admin/users/active/']
            );
            expect(Array.from(output.querySelectorAll('button'), (button) => button.textContent)).toContain('Account');
        },
        '/admin/users/active/42/'
    );
});

it('keeps mobile and desktop collapse preferences independent across viewport changes', async () => {
    // Arrange
    viewport.setViewport({ width: 1280 });

    // Act
    await withMounted(
        <Platform action={null} tabs={[{ href: '/admin', label: 'Overview' }]}>
            <h1>Overview</h1>
        </Platform>,
        async (output) => {
            // Assert
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();

            // Act
            await act(async () =>
                output.querySelector<HTMLButtonElement>('button[aria-label="Collapse sidebar"]')?.click()
            );
            await act(async () => viewport.setViewport({ width: 767 }));

            // Assert
            expect(output.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();

            // Act
            await act(async () =>
                output.querySelector<HTMLButtonElement>('button[aria-label="Expand sidebar"]')?.click()
            );
            await act(async () => viewport.setViewport({ width: 1280 }));

            // Assert
            expect(output.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();

            // Act
            await act(async () =>
                output.querySelector<HTMLButtonElement>('button[aria-label="Expand sidebar"]')?.click()
            );
            await act(async () => viewport.setViewport({ width: 767 }));

            // Assert
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
        }
    );
});

it('retains focused content drafts when crossing the standard desktop breakpoint', async () => {
    viewport.setViewport({ width: 768 });

    await withMounted(
        <Platform
            action={<input aria-label="Sidebar draft" defaultValue="Account note" />}
            sidebarHeader={<button>Workspace switcher</button>}
            tabs={[{ href: '/admin', label: 'Overview' }]}
        >
            <input aria-label="Unsaved name" defaultValue="Original" />
        </Platform>,
        async (output) => {
            const draft = output.querySelector<HTMLInputElement>('input[aria-label="Unsaved name"]');
            if (!draft) throw new Error('Missing draft input');
            const user = userEvent.setup();

            await act(async () => {
                await user.clear(draft);
                await user.type(draft, 'Unsaved edit');
            });
            await act(async () => viewport.setViewport({ width: 767 }));
            expect(output.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();
            expect(document.activeElement).toBe(draft);
            await act(async () => viewport.setViewport({ width: 768 }));
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
            await act(async () => output.querySelector<HTMLButtonElement>('button[aria-controls]')?.click());
            expect(output.querySelector('input[aria-label="Unsaved name"]')).toBe(draft);
            expect(draft.value).toBe('Unsaved edit');
            expect(output.textContent).toContain('Workspace switcher');
        }
    );
});

/** Exposes actual router transitions without a View-specific link provider. */
function NavigationPage() {
    const { pathname } = useLocation();
    const navigate = useNavigate();

    return (
        <Platform
            action={null}
            tabs={[
                { href: '/admin', label: 'Overview' },
                { href: '/admin/users', label: 'Users' }
            ]}
        >
            <output>{pathname}</output>
            <button
                onClick={() => {
                    void navigate(-1);
                }}
            >
                Back
            </button>
        </Platform>
    );
}

it('supports keyboard SPA navigation and restores selection and breadcrumb after router back', async () => {
    viewport.setViewport({ width: 1280 });

    await withMounted(
        <NavigationPage />,
        async (output) => {
            const users = output.querySelector<HTMLAnchorElement>('a[href="/admin/users"]');

            if (!users) throw new Error('Missing Users link');
            const user = userEvent.setup();
            users.focus();

            await act(async () => user.keyboard('{Enter}'));
            expect(output.querySelector('output')?.textContent).toBe('/admin/users');
            expect(output.querySelector('a[aria-current="page"]')).toBe(users);
            expect(output.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')?.textContent).toBe(
                'Users'
            );
            expect(output.querySelector('nav[aria-label="Breadcrumb"] a')).toBeNull();
            expect(document.activeElement).toBe(users);

            await act(async () => output.querySelector<HTMLButtonElement>('main button:not([aria-controls])')?.click());
            expect(output.querySelector('output')?.textContent).toBe('/admin');
            expect(output.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/admin');
            expect(output.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')?.textContent).toBe(
                'Overview'
            );

            await act(async () => output.querySelector<HTMLAnchorElement>('a[href^="#"]')?.click());
            expect(document.activeElement).toBe(output.querySelector('main'));
        },
        '/admin'
    );
});

/** Allows a parent to cancel navigation just as an unsaved-changes guard would. */
function GuardedNavigation() {
    const [guarded, setGuarded] = useState(true);
    const { pathname } = useLocation();

    return (
        <section
            onClickCapture={(event) => {
                if (guarded && event.target instanceof Element && event.target.closest('a')) event.preventDefault();
            }}
        >
            <Platform action={null} tabs={[{ href: '/admin/users', label: 'Users' }]}>
                <output>{pathname}</output>
                <button onClick={() => setGuarded(false)}>Allow navigation</button>
            </Platform>
        </section>
    );
}

it('closes only mobile navigation and only after an unmodified, uncanceled route click', async () => {
    viewport.setViewport({ width: 1280 });

    await withMounted(
        <GuardedNavigation />,
        async (output) => {
            await act(async () => viewport.setViewport({ width: 767 }));
            await act(async () => output.querySelector<HTMLButtonElement>('button[aria-controls]')?.click());
            const users = document.querySelector<HTMLAnchorElement>('[role="dialog"] a[href="/admin/users"]');

            if (!users) throw new Error('Missing Users link');

            await act(async () => users.click());
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
            expect(output.querySelector('output')?.textContent).toBe('/admin');
            await act(async () => output.querySelector<HTMLButtonElement>('main button:not([aria-controls])')?.click());

            for (const gesture of [
                { ctrlKey: true },
                { metaKey: true },
                { shiftKey: true },
                { altKey: true },
                { button: 1 }
            ]) {
                await act(async () =>
                    users.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...gesture }))
                );
                expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
                expect(output.querySelector('output')?.textContent).toBe('/admin');
            }

            await act(async () => users.click());
            expect(output.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();
            expect(document.querySelector('[role="dialog"]')).toBeNull();
            expect(output.querySelector('output')?.textContent).toBe('/admin/users');

            await act(async () => viewport.setViewport({ width: 1280 }));
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
        },
        '/admin'
    );
});

it('opens mobile navigation by keyboard and restores focus after Escape', async () => {
    // Arrange
    viewport.setViewport({ width: 767 });
    const user = userEvent.setup();

    await withMounted(
        <Platform
            action={null}
            tabs={[
                { href: '/solution', label: 'Solution view' },
                { href: '/admin/users', icon: <Users aria-hidden="true" size={16} />, label: 'Users' }
            ]}
        >
            <input aria-label="Draft" defaultValue="Unsaved" />
        </Platform>,
        async (output) => {
            const trigger = output.querySelector<HTMLButtonElement>('button[aria-controls]');
            if (!trigger) throw new Error('Missing sidebar trigger');

            // Act
            await act(async () => {
                trigger.focus();
                await user.keyboard('{Enter}');
            });

            // Assert
            const dialog = document.querySelector('[role="dialog"]');
            expect(dialog?.querySelector('a[href="/solution"]')?.textContent).toBe('Solution view');
            expect(dialog?.querySelector('a[href="/admin/users"]')?.textContent).toBe('Users');
            expect(dialog?.contains(document.activeElement)).toBe(true);

            // Act
            await act(async () => user.keyboard('{Escape}'));

            // Assert
            expect(document.querySelector('[role="dialog"]')).toBeNull();
            expect(document.activeElement).toBe(trigger);
        }
    );
});
