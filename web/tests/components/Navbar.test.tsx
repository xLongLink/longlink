// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { Navbar } from '@/components/Navbar';
import { LinkProvider } from '@astryxdesign/core/Link';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Link as RouterLink, Route, Routes } from 'react-router';

const initialWidth = window.innerWidth;

const initialScroll = { left: window.scrollX, top: window.scrollY };

beforeEach(() => {
    window.innerWidth = 390;
    window.scrollTo(0, 0);
});

afterEach(() => {
    vi.restoreAllMocks();
    window.innerWidth = initialWidth;
    window.scrollTo(initialScroll);
});

it('opens the mobile drawer and exposes its expanded state', async () => {
    // Arrange
    await withMounted(<Navbar />, async (output) => {
        const open = output.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');

        if (!open) throw new Error('Expected the navigation toggle');

        expect(open.getAttribute('aria-expanded')).toBe('false');
        expect(document.querySelector('dialog[open]')).toBeNull();

        // Act
        await act(async () => open.click());

        // Assert
        expect(open.getAttribute('aria-expanded')).toBe('true');
        expect(document.querySelector('dialog[open] nav[aria-label="Public pages"]')).not.toBeNull();
    });
});

it.each([
    { href: '/docs/', label: 'Documentation' },
    { href: '/login/', label: 'Sign In' },
])('closes the drawer when $label navigates to $href', async ({ href, label }) => {
    // Arrange
    await withMounted(
        <LinkProvider component={RouterLink}>
            <Navbar />
            <Routes>
                <Route path="/" element={null} />
                <Route path={href} element={<h1>{label}</h1>} />
            </Routes>
        </LinkProvider>,
        async (output) => {
            const open = output.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');

            if (!open) throw new Error('Expected the navigation toggle');

            await act(async () => open.click());
            expect(open.getAttribute('aria-expanded')).toBe('true');

            const link = document.querySelector<HTMLAnchorElement>(`dialog[open] a[href="${href}"]`);

            if (!link) throw new Error(`Expected the mobile ${label} link`);

            // Act
            await act(async () => link.click());

            // Assert
            expect(output.querySelector('h1')?.textContent).toBe(label);
            expect(open.getAttribute('aria-expanded')).toBe('false');
            await vi.waitFor(() => expect(document.querySelector('dialog[open]')).toBeNull());
        }
    );
});

it('closes the mobile drawer at the desktop breakpoint and keeps it closed on return', async () => {
    // Arrange
    await withMounted(<Navbar />, async (output) => {
        const open = output.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');

        if (!open) throw new Error('Expected the navigation toggle');

        await act(async () => open.click());
        expect(open.getAttribute('aria-expanded')).toBe('true');

        // Act
        await act(async () => {
            window.innerWidth = 639;
            window.dispatchEvent(new Event('resize'));
        });
        expect(open.getAttribute('aria-expanded')).toBe('true');

        await act(async () => {
            window.innerWidth = 640;
            window.dispatchEvent(new Event('resize'));
        });

        // Assert
        expect(open.getAttribute('aria-expanded')).toBe('false');
        await vi.waitFor(() => expect(document.querySelector('dialog[open]')).toBeNull());

        await act(async () => {
            window.innerWidth = 390;
            window.dispatchEvent(new Event('resize'));
        });
        expect(open.getAttribute('aria-expanded')).toBe('false');
    });
});

it('expands landing navigation only at the top, including an initially scrolled page', async () => {
    // Arrange
    window.scrollTo(0, 100);

    await withMounted(<Navbar expandOnTop maxWidth={1120} />, async (output) => {
        const content = output.querySelector<HTMLElement>('header > *');

        if (!content) throw new Error('Expected the navigation content');

        expect(content.style.maxWidth).toBe('1120px');

        // Act
        await act(async () => {
            window.scrollTo(0, 0);
            window.dispatchEvent(new Event('scroll'));
        });

        // Assert
        expect(content.style.maxWidth).toBe('100%');

        await act(async () => {
            window.scrollTo(0, 100);
            window.dispatchEvent(new Event('scroll'));
        });
        expect(content.style.maxWidth).toBe('1120px');
    });
});

it('keeps non-landing navigation constrained without reading the scroll position', async () => {
    // Arrange
    const scrollPosition = vi.spyOn(window, 'scrollY', 'get');

    await withMounted(
        <Navbar />,
        async (output) => {
            const content = output.querySelector<HTMLElement>('header > *');

            if (!content) throw new Error('Expected the navigation content');

            expect(content.style.maxWidth).toBe('1000px');

            // Act
            scrollPosition.mockClear();
            await act(async () => {
                window.scrollTo(0, 100);
                window.dispatchEvent(new Event('scroll'));
            });

            // Assert
            expect(content.style.maxWidth).toBe('1000px');
            expect(scrollPosition).not.toHaveBeenCalled();
        },
        '/docs/'
    );
});

it('stops reading the scroll position after landing navigation unmounts', async () => {
    // Arrange
    const scrollPosition = vi.spyOn(window, 'scrollY', 'get');

    await withMounted(<Navbar expandOnTop />, async () => {
        scrollPosition.mockClear();

        // Act
        await act(async () => {
            window.scrollTo(0, 100);
            window.dispatchEvent(new Event('scroll'));
        });

        // Assert
        expect(scrollPosition).toHaveBeenCalled();
    });

    // Act
    scrollPosition.mockClear();
    window.dispatchEvent(new Event('scroll'));

    // Assert
    expect(scrollPosition).not.toHaveBeenCalled();
});
