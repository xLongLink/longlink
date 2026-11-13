// @vitest-environment happy-dom
import { act, useState } from 'react';
import type { Window } from 'happy-dom';
import { withMounted } from '../../render';
import { Home, Users } from 'lucide-react';
import userEvent from '@testing-library/user-event';
import Platform from '@/components/layouts/Platform';
import { useLocation, useNavigate } from 'react-router';
import { it, vi, expect, afterEach, beforeEach } from 'vitest';

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

it('preserves the original trailing-slash tab href', async () => {
    // Arrange
    viewport.setViewport({ width: 1280 });

    // Act
    await withMounted(
        <Platform
            action={null}
            tabs={[
                { href: '/admin/users/', label: 'Users' },
                { href: '/admin', label: 'Overview' }
            ]}
        >
            <h1>User details</h1>
        </Platform>,
        async (output) => {
            // Assert
            expect(Array.from(output.querySelectorAll('a[aria-current]'), (link) => link.getAttribute('href'))).toEqual(
                ['/admin/users/']
            );
        },
        '/admin/users/42/'
    );
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
                { href: '/admin/users/active', label: 'Active users' }
            ]}
        >
            <h1>User details</h1>
        </Platform>,
        async (output) => {
            // Assert
            expect(output.querySelector('nav[aria-label="Section navigation"]')).not.toBeNull();
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
            expect(Array.from(output.querySelectorAll('a[aria-current]'), (link) => link.getAttribute('href'))).toEqual(
                ['/admin/users/active']
            );
            expect(output.querySelector('h1')?.textContent).toBe('User details');
            expect(Array.from(output.querySelectorAll('button'), (button) => button.textContent)).toContain('Account');
        },
        '/admin/users/active/42/'
    );
});

it('keeps the sidebar when navigation is empty', async () => {
    // Act
    await withMounted(
        <Platform action={null} tabs={[]}>
            <h1>Solution content</h1>
        </Platform>,
        async (output) => {
            // Assert
            expect(output.querySelector('nav[aria-label="Section navigation"]')).not.toBeNull();
            expect(output.querySelector('nav[aria-label="Platform navigation"]')).toBeNull();

            expect(output.querySelector('h1')?.textContent).toBe('Solution content');
        }
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
            await act(async () => viewport.setViewport({ width: 768 }));

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
            await act(async () => viewport.setViewport({ width: 768 }));

            // Assert
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
        }
    );
});

it('closes mobile navigation after following a link without collapsing desktop navigation', async () => {
    // Arrange
    viewport.setViewport({ width: 1280 });

    // Act
    await withMounted(
        <Platform
            action={null}
            tabs={[
                { href: '/admin', icon: <Home aria-hidden="true" />, label: 'Overview' },
                { href: '/admin/users', icon: <Users aria-hidden="true" />, label: 'Users' }
            ]}
        >
            <h1>Administration</h1>
        </Platform>,
        async (output) => {
            // Act
            await act(async () => viewport.setViewport({ width: 768 }));

            // Assert
            expect(output.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();

            // Act
            await act(async () =>
                output.querySelector<HTMLButtonElement>('button[aria-label="Expand sidebar"]')?.click()
            );

            // Assert
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();

            // Act
            await act(async () => output.querySelector<HTMLAnchorElement>('a[href="/admin/users"]')?.click());

            // Assert
            expect(output.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();
            expect(
                Array.from(output.querySelectorAll('a[aria-current="page"]'), (link) => link.getAttribute('href'))
            ).toEqual(['/admin/users']);

            // Act
            await act(async () => viewport.setViewport({ width: 1280 }));

            // Assert
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
        },
        '/admin'
    );
});

it('retains focused drafts and sidebar controls when crossing the exact desktop breakpoint', async () => {
    viewport.setViewport({ width: 1024 });

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
            const sidebarDraft = output.querySelector<HTMLInputElement>('input[aria-label="Sidebar draft"]');

            if (!draft || !sidebarDraft) throw new Error('Missing draft inputs');
            const user = userEvent.setup();

            await act(async () => {
                await user.clear(draft);
                await user.type(draft, 'Unsaved edit');
            });
            await act(async () => viewport.setViewport({ width: 1023 }));
            expect(output.querySelector('button[aria-label="Expand sidebar"]')).not.toBeNull();
            expect(document.activeElement).toBe(draft);
            await act(async () => viewport.setViewport({ width: 1024 }));
            expect(output.querySelector('button[aria-label="Collapse sidebar"]')).not.toBeNull();
            await act(async () => output.querySelector<HTMLButtonElement>('button[aria-controls]')?.click());
            expect(output.querySelector('input[aria-label="Unsaved name"]')).toBe(draft);
            expect(draft.value).toBe('Unsaved edit');
            expect(output.querySelector('input[aria-label="Sidebar draft"]')).toBe(sidebarDraft);
            expect(sidebarDraft.value).toBe('Account note');
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
            expect(output.querySelector('nav[aria-label="Breadcrumb"]')?.textContent).toBe('Users');
            expect(document.activeElement).toBe(users);

            await act(async () => output.querySelector<HTMLButtonElement>('main button:not([aria-controls])')?.click());
            expect(output.querySelector('output')?.textContent).toBe('/admin');
            expect(output.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/admin');
            expect(output.querySelector('nav[aria-label="Breadcrumb"]')?.textContent).toBe('Overview');

            await act(async () => output.querySelector<HTMLAnchorElement>('.platform-skip-link')?.click());
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

it('does not close mobile navigation for cancelled or modified link gestures', async () => {
    viewport.setViewport({ width: 768 });

    await withMounted(
        <GuardedNavigation />,
        async (output) => {
            await act(async () => output.querySelector<HTMLButtonElement>('button[aria-controls]')?.click());
            const users = output.querySelector<HTMLAnchorElement>('a[href="/admin/users"]');

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
            expect(output.querySelector('output')?.textContent).toBe('/admin/users');
        },
        '/admin'
    );
});

it('describes the initial collapsed rail on keyboard focus and keeps anchors mounted when expanded', async () => {
    viewport.setViewport({ width: 768 });
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
            const users = output.querySelector<HTMLAnchorElement>('a[href="/admin/users"]');
            const solution = output.querySelector<HTMLAnchorElement>('a[href="/solution"]');

            if (!users || !solution) throw new Error('Missing navigation links');

            expect(solution.hidden).toBe(true);
            expect(output.querySelector('.platform-logo')?.getAttribute('width')).toBe('32');
            expect(output.querySelector('.platform-logo')?.getAttribute('height')).toBe('32');
            await act(async () => {
                await user.tab();
                await user.tab();
                await user.tab();
            });
            expect(document.activeElement).toBe(users);
            await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Users'));
            expect(document.querySelector('[role="tooltip"]')?.id).toBe(users.getAttribute('aria-describedby'));
            expect(users.getAttribute('aria-label')).toBe('Users');

            await act(async () => {
                await user.tab();
                await user.keyboard('{Enter}');
            });
            expect(output.querySelector('a[href="/admin/users"]')).toBe(users);
            expect(output.querySelector('a[href="/solution"]')).toBe(solution);
            expect(solution.hidden).toBe(false);
            expect(solution.textContent).toBe('Solution view');
            expect(output.querySelector('.platform-wordmark')?.getAttribute('width')).toBe('1781');
            expect(output.querySelector('.platform-wordmark')?.getAttribute('height')).toBe('286');
            await act(async () => user.tab({ shift: true }));
            expect(document.activeElement).toBe(users);
            expect(document.querySelector('[role="tooltip"]')).toBeNull();
            expect(users.hasAttribute('aria-describedby')).toBe(false);
        }
    );
});

it('shows labels on hover only for collapsed iconful navigation', async () => {
    viewport.setViewport({ width: 1280 });
    const user = userEvent.setup();

    await withMounted(
        <Platform action={null} tabs={[{ href: '/admin/users', icon: <Users aria-hidden="true" />, label: 'Users' }]}>
            <h1>Administration</h1>
        </Platform>,
        async (output) => {
            const users = output.querySelector<HTMLAnchorElement>('a[href="/admin/users"]');

            if (!users) throw new Error('Missing Users link');

            await act(async () => user.hover(users));
            expect(document.querySelector('[role="tooltip"]')).toBeNull();
            await act(async () => user.unhover(users));
            await act(async () => output.querySelector<HTMLButtonElement>('button[aria-controls]')?.click());
            expect(output.querySelector('a[href="/admin/users"]')).toBe(users);
            await act(async () => user.hover(users));
            await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Users'));
            await act(async () => user.unhover(users));
            await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
            expect(output.querySelector('a[href="/admin/users"]')).toBe(users);
        }
    );
});
