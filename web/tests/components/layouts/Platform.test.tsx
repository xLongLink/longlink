// @vitest-environment happy-dom
import { act } from 'react';
import { Link } from 'react-router';
import type { Window } from 'happy-dom';
import { withMounted } from '../../render';
import { Home, Users } from 'lucide-react';
import Platform from '@/components/layouts/Platform';
import { LinkProvider } from '@astryxdesign/core/Link';
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

it('preserves the original trailing-slash tab href', async () => {
    // Arrange
    viewport.setViewport({ width: 1280 });

    // Act
    await withMounted(
        <LinkProvider component={Link}>
            <Platform
                action={null}
                tabs={[
                    { href: '/admin/users/', label: 'Users' },
                    { href: '/admin', label: 'Overview' },
                ]}
            >
                <h1>User details</h1>
            </Platform>
        </LinkProvider>,
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
        <LinkProvider component={Link}>
            <Platform
                action={<button>Account</button>}
                tabs={[
                    { href: '/admin', label: 'Overview' },
                    { href: '/admin/users', label: 'Users' },
                    { href: '/admin/users/active', label: 'Active users' },
                ]}
            >
                <h1>User details</h1>
            </Platform>
        </LinkProvider>,
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
        <LinkProvider component={Link}>
            <Platform
                action={null}
                tabs={[
                    { href: '/admin', icon: <Home aria-hidden="true" />, label: 'Overview' },
                    { href: '/admin/users', icon: <Users aria-hidden="true" />, label: 'Users' },
                ]}
            >
                <h1>Administration</h1>
            </Platform>
        </LinkProvider>,
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
