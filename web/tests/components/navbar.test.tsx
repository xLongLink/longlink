// @vitest-environment happy-dom
import { act } from 'react';
import { withMounted } from '../render';
import { Navbar } from '@/components/ui/navbar';
import userEvent from '@testing-library/user-event';
import NotFound from '@/components/layouts/not-found';
import Publication from '@/platform/layouts/publication';
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

it('navigates away from a missing publication and keeps the drawer closed on router back', async () => {
    // Arrange
    await withMounted(
        <>
            <Back />
            <Routes>
                <Route element={<Publication />}>
                    <Route path="/docs/" element={<h1>Documentation</h1>} />
                    <Route path="/docs/*" element={<NotFound />} />
                </Route>
            </Routes>
        </>,
        async (output) => {
            expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
                'noindex, nofollow'
            );
            const externalLinks = output.querySelectorAll<HTMLAnchorElement>('footer a[target="_blank"]');
            expect(externalLinks.length).toBeGreaterThan(0);
            for (const link of externalLinks) {
                expect(link.rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
            }

            const open = output.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');

            if (!open) throw new Error('Expected the navigation toggle');

            await act(async () => open.click());
            expect(open.getAttribute('aria-expanded')).toBe('true');

            const link = document.querySelector<HTMLAnchorElement>('[role="dialog"] a[href="/docs/"]');

            if (!link) throw new Error('Expected the mobile documentation link');

            // Act
            await act(async () => link.click());

            // Assert
            expect(output.querySelector('h1')?.textContent).toBe('Documentation');
            expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
            expect(open.getAttribute('aria-expanded')).toBe('false');
            await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());

            // Assert history was pushed rather than replacing the page or entry.
            const back = Array.from(output.querySelectorAll('button')).find((button) => button.textContent === 'Back');

            if (!back) throw new Error('Expected history control');
            await act(async () => back.click());
            expect(output.querySelector('h1')?.textContent).toBe("We can't find that page");
            expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
                'noindex, nofollow'
            );
            expect(open.getAttribute('aria-expanded')).toBe('false');
        },
        '/docs/missing/'
    );
});

it('dismisses with Escape and restores focus so keyboard users can reopen navigation', async () => {
    const user = userEvent.setup();
    await withMounted(<Navbar />, async (output) => {
        const open = output.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]');

        if (!open) throw new Error('Expected navigation toggle');
        expect(open.getAttribute('aria-expanded')).toBe('false');
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        await act(async () => user.click(open));
        expect(open.getAttribute('aria-expanded')).toBe('true');
        expect(document.querySelector('[role="dialog"] nav[aria-label="Public pages"]')).not.toBeNull();

        await act(async () => user.keyboard('{Escape}'));
        await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
        await vi.waitFor(() => expect(document.activeElement).toBe(open));
        await act(async () => user.keyboard('{Enter}'));
        expect(open.getAttribute('aria-expanded')).toBe('true');
    });
});

it('leaves modified link gestures to the browser while closing the drawer', async () => {
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
            expect(link.getAttribute('role')).toBeNull();
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
