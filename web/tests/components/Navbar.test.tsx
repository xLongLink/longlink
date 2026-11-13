// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { Navbar } from '@/components/Navbar';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useNavigate } from 'react-router';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';

const initialWidth = window.innerWidth;

const initialScroll = { left: window.scrollX, top: window.scrollY };

/** Exposes real history traversal without replacing router navigation. */
function Back() {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            onClick={() => {
                void navigate(-1);
            }}
        >
            Back
        </button>
    );
}

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
        expect(document.querySelector('[role="dialog"]')).toBeNull();

        // Act
        await act(async () => open.click());

        // Assert
        expect(open.getAttribute('aria-expanded')).toBe('true');
        expect(document.querySelector('[role="dialog"] nav[aria-label="Public pages"]')).not.toBeNull();
    });
});

it.each([
    { href: '/docs/', label: 'Documentation' },
    { href: '/login/', label: 'Sign In' },
])('closes the drawer when $label navigates to $href', async ({ href, label }) => {
    // Arrange
    await withMounted(
        <>
            <Navbar />
            <Back />
            <Routes>
                <Route path="/" element={<h1>Home</h1>} />
                <Route path={href} element={<h1>{label}</h1>} />
            </Routes>
        </>,
        async (output) => {
            const open = output.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');

            if (!open) throw new Error('Expected the navigation toggle');

            await act(async () => open.click());
            expect(open.getAttribute('aria-expanded')).toBe('true');

            const link = document.querySelector<HTMLAnchorElement>(`[role="dialog"] a[href="${href}"]`);

            if (!link) throw new Error(`Expected the mobile ${label} link`);

            // Act
            await act(async () => link.click());

            // Assert
            expect(output.querySelector('h1')?.textContent).toBe(label);
            expect(open.getAttribute('aria-expanded')).toBe('false');
            await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());

            // Assert history was pushed rather than replacing the page or entry.
            const back = Array.from(output.querySelectorAll('button')).find((button) => button.textContent === 'Back');

            if (!back) throw new Error('Expected history control');
            await act(async () => back.click());
            expect(output.querySelector('h1')?.textContent).toBe('Home');
            expect(open.getAttribute('aria-expanded')).toBe('false');
        }
    );
});

it('dismisses with Escape and restores focus so keyboard users can reopen navigation', async () => {
    const user = userEvent.setup();
    await withMounted(<Navbar />, async (output) => {
        const open = output.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');

        if (!open) throw new Error('Expected navigation toggle');
        await act(async () => user.click(open));
        expect(document.querySelector('[role="dialog"]')).not.toBeNull();

        await act(async () => user.keyboard('{Escape}'));
        await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
        await vi.waitFor(() => expect(document.activeElement).toBe(open));
        await act(async () => user.keyboard('{Enter}'));
        expect(open.getAttribute('aria-expanded')).toBe('true');
    });
});

it('leaves modified link gestures to the browser while closing the drawer synchronously', async () => {
    await withMounted(
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<h1>Home</h1>} />
                <Route path="/docs/" element={<h1>Docs</h1>} />
            </Routes>
        </>,
        async (output) => {
            const open = output.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');

            if (!open) throw new Error('Expected navigation toggle');
            await act(async () => open.click());
            const link = document.querySelector<HTMLAnchorElement>('[role="dialog"] a[href="/docs/"]');

            if (!link) throw new Error('Expected documentation link');
            const gesture = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

            await act(async () => {
                link.dispatchEvent(gesture);
            });

            expect(gesture.defaultPrevented).toBe(false);
            expect(output.querySelector('h1')?.textContent).toBe('Home');
            expect(open.getAttribute('aria-expanded')).toBe('false');
            await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
        }
    );
});

it('dismisses on an outside press without leaving the drawer stuck open', async () => {
    const user = userEvent.setup();
    await withMounted(<Navbar />, async (output) => {
        const open = output.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');

        if (!open) throw new Error('Expected navigation toggle');
        await act(async () => user.click(open));
        const backdrop = document.querySelector<HTMLElement>('.public-navbar-backdrop');

        if (!backdrop) throw new Error('Expected navigation backdrop');

        await act(async () => user.click(backdrop));

        expect(open.getAttribute('aria-expanded')).toBe('false');
        await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
        await act(async () => user.click(open));
        expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    });
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
        await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());

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
